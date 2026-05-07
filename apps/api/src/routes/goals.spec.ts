import { describe, it, expect } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { call } from "../../test/helpers/request";
import {
  makeBook,
  makeRun,
  makeSession,
  makeUser,
} from "../../test/helpers/factories";
import { db } from "../lib/database";

type Goal = {
  id: string;
  userId: string;
  type: "daily" | "yearly";
  metric: "minutes" | "pages" | "books";
  target: number;
};

type Progress = {
  daily: { goal: { metric: string; target: number }; actual: number } | null;
  yearly: { goal: { metric: string; target: number }; actual: number } | null;
};

describe("/api/goals", () => {
  describe("authorization", () => {
    it.each([
      ["GET", "/api/goals"],
      ["POST", "/api/goals"],
      ["GET", "/api/goals/progress?date=2026-05-07&tz=UTC"],
      ["DELETE", "/api/goals/01999999-9999-7999-8999-999999999999"],
    ])("%s %s returns 401 without auth", async (method, path) => {
      const response = await call(method, path);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/goals", () => {
    it("creates a daily goal", async () => {
      const user = await makeUser();
      const id = uuidv7();

      const response = await call("POST", "/api/goals", {
        as: user,
        body: { id, type: "daily", metric: "minutes", target: 30 },
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as Goal;
      expect(body.id).toBe(id);
      expect(body.type).toBe("daily");
      expect(body.metric).toBe("minutes");
      expect(body.target).toBe(30);
    });

    it("upserts on (userId, type): second POST keeps the original id and updates the target", async () => {
      const user = await makeUser();
      const firstId = uuidv7();
      const secondId = uuidv7();

      const first = await call("POST", "/api/goals", {
        as: user,
        body: { id: firstId, type: "daily", metric: "minutes", target: 30 },
      });
      expect(first.status).toBe(201);

      const second = await call("POST", "/api/goals", {
        as: user,
        body: { id: secondId, type: "daily", metric: "pages", target: 50 },
      });
      expect(second.status).toBe(200);

      const body = (await second.json()) as Goal;
      expect(body.id).toBe(firstId);
      expect(body.metric).toBe("pages");
      expect(body.target).toBe(50);

      const rows = await db
        .selectFrom("goal")
        .selectAll()
        .where("userId", "=", user.id)
        .execute();
      expect(rows).toHaveLength(1);
    });

    it("rejects {type:'daily', metric:'books'} with 400", async () => {
      const user = await makeUser();
      const response = await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "daily", metric: "books", target: 10 },
      });
      expect(response.status).toBe(400);
    });

    it("rejects {type:'yearly', metric:'minutes'} with 400", async () => {
      const user = await makeUser();
      const response = await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "yearly", metric: "minutes", target: 30 },
      });
      expect(response.status).toBe(400);
    });

    it("rejects target <= 0 with 400", async () => {
      const user = await makeUser();
      const response = await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "daily", metric: "minutes", target: 0 },
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/goals", () => {
    it("returns only the caller's goals", async () => {
      const user = await makeUser();
      const other = await makeUser();

      await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "daily", metric: "minutes", target: 30 },
      });
      await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "yearly", metric: "books", target: 12 },
      });
      await call("POST", "/api/goals", {
        as: other,
        body: { id: uuidv7(), type: "daily", metric: "pages", target: 20 },
      });

      const response = await call("GET", "/api/goals", { as: user });
      expect(response.status).toBe(200);
      const body = (await response.json()) as Goal[];
      expect(body).toHaveLength(2);
      expect(body.every((g) => g.userId === user.id)).toBe(true);
    });
  });

  describe("GET /api/goals/progress", () => {
    it("returns {daily:null, yearly:null} when the user has no goals", async () => {
      const user = await makeUser();
      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=UTC",
        { as: user },
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as Progress;
      expect(body).toEqual({ daily: null, yearly: null });
    });

    it("returns 400 for an invalid timezone", async () => {
      const user = await makeUser();
      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=Mars/Olympus",
        { as: user },
      );
      expect(response.status).toBe(400);
    });

    it("accepts a legacy IANA alias the browser may emit (e.g. Europe/Kiev) by mapping to the canonical name", async () => {
      const user = await makeUser();
      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=Europe/Kiev",
        { as: user },
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as Progress;
      expect(body).toEqual({ daily: null, yearly: null });
    });

    it("aggregates daily minutes within the local-day window in the requested tz", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 1000 });
      const run = await makeRun({ userId: user.id, bookId: book.id });

      await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "daily", metric: "minutes", target: 60 },
      });

      // America/New_York on 2026-05-07: local day = [2026-05-07T04:00Z, 2026-05-08T04:00Z).
      // (a) Inside the local day, before UTC midnight rollover.
      await makeSession({
        userId: user.id,
        runId: run.id,
        startTime: new Date("2026-05-07T22:00:00Z"),
        endTime: new Date("2026-05-07T22:30:00Z"),
        readPages: 10,
        readTime: 1800,
      });
      // (b) Inside the local day, after UTC midnight (still 2026-05-07 in NY).
      await makeSession({
        userId: user.id,
        runId: run.id,
        startTime: new Date("2026-05-08T03:00:00Z"),
        endTime: new Date("2026-05-08T03:15:00Z"),
        readPages: 5,
        readTime: 900,
      });
      // (c) Outside the local day (2026-05-08 in NY at 12:00 local = 16:00Z).
      await makeSession({
        userId: user.id,
        runId: run.id,
        startTime: new Date("2026-05-08T16:00:00Z"),
        endTime: new Date("2026-05-08T16:30:00Z"),
        readPages: 7,
        readTime: 1200,
      });

      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=America/New_York",
        { as: user },
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Progress;
      expect(body.daily?.goal).toEqual({ metric: "minutes", target: 60 });
      // (1800 + 900) / 60 = 45
      expect(body.daily?.actual).toBe(45);
    });

    it("aggregates daily pages within the local-day window", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 1000 });
      const run = await makeRun({ userId: user.id, bookId: book.id });

      await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "daily", metric: "pages", target: 25 },
      });

      await makeSession({
        userId: user.id,
        runId: run.id,
        startTime: new Date("2026-05-07T10:00:00Z"),
        endTime: new Date("2026-05-07T10:15:00Z"),
        readPages: 12,
        readTime: 900,
      });
      await makeSession({
        userId: user.id,
        runId: run.id,
        startTime: new Date("2026-05-07T20:00:00Z"),
        endTime: new Date("2026-05-07T20:15:00Z"),
        readPages: 6,
        readTime: 900,
      });

      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=UTC",
        { as: user },
      );

      const body = (await response.json()) as Progress;
      expect(body.daily?.actual).toBe(18);
    });

    it("counts only completed reading runs in the year for yearly books goal", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "yearly", metric: "books", target: 12 },
      });

      // Two completed runs in 2026
      await makeRun({
        userId: user.id,
        bookId: book.id,
        status: "completed",
        finishedAt: new Date("2026-02-01T00:00:00Z"),
      });
      await makeRun({
        userId: user.id,
        bookId: book.id,
        status: "completed",
        finishedAt: new Date("2026-08-15T00:00:00Z"),
      });
      // Abandoned in 2026 — does not count
      await makeRun({
        userId: user.id,
        bookId: book.id,
        status: "abandoned",
        finishedAt: new Date("2026-04-01T00:00:00Z"),
      });
      // Active — does not count
      await makeRun({
        userId: user.id,
        bookId: book.id,
        status: "active",
      });
      // Completed in prior year — does not count
      await makeRun({
        userId: user.id,
        bookId: book.id,
        status: "completed",
        finishedAt: new Date("2025-12-15T00:00:00Z"),
      });

      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=UTC",
        { as: user },
      );

      const body = (await response.json()) as Progress;
      expect(body.yearly?.goal).toEqual({ metric: "books", target: 12 });
      expect(body.yearly?.actual).toBe(2);
    });

    it("scopes progress aggregations to the caller", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const book = await makeBook({ userId: other.id, totalPages: 1000 });
      const run = await makeRun({ userId: other.id, bookId: book.id });

      await call("POST", "/api/goals", {
        as: user,
        body: { id: uuidv7(), type: "daily", metric: "minutes", target: 30 },
      });

      await makeSession({
        userId: other.id,
        runId: run.id,
        startTime: new Date("2026-05-07T12:00:00Z"),
        endTime: new Date("2026-05-07T12:30:00Z"),
        readPages: 10,
        readTime: 1800,
      });

      const response = await call(
        "GET",
        "/api/goals/progress?date=2026-05-07&tz=UTC",
        { as: user },
      );

      const body = (await response.json()) as Progress;
      expect(body.daily?.actual).toBe(0);
    });
  });

  describe("DELETE /api/goals/:goalId", () => {
    it("deletes the caller's goal", async () => {
      const user = await makeUser();
      const id = uuidv7();
      await call("POST", "/api/goals", {
        as: user,
        body: { id, type: "daily", metric: "minutes", target: 30 },
      });

      const first = await call("DELETE", `/api/goals/${id}`, { as: user });
      expect(first.status).toBe(204);

      const second = await call("DELETE", `/api/goals/${id}`, { as: user });
      expect(second.status).toBe(404);
    });

    it("returns 404 when deleting another user's goal", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const id = uuidv7();
      await call("POST", "/api/goals", {
        as: other,
        body: { id, type: "daily", metric: "minutes", target: 30 },
      });

      const response = await call("DELETE", `/api/goals/${id}`, { as: user });
      expect(response.status).toBe(404);
    });
  });
});
