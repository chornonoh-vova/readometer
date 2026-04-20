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

describe("/api/reading-sessions", () => {
  describe("authorization", () => {
    it.each([
      [
        "GET",
        "/api/reading-sessions?runId=01999999-9999-7999-8999-999999999999",
      ],
      ["POST", "/api/reading-sessions"],
      ["PUT", "/api/reading-sessions/01999999-9999-7999-8999-999999999999"],
      ["DELETE", "/api/reading-sessions/01999999-9999-7999-8999-999999999999"],
    ])("%s %s returns 401 without auth", async (method, path) => {
      const response = await call(method, path);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/reading-sessions", () => {
    it("advances the run's completedPages and inserts the session", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 300 });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 10,
      });

      const now = new Date();
      const later = new Date(now.getTime() + 30 * 60_000);
      const sessionId = uuidv7();

      const response = await call("POST", "/api/reading-sessions", {
        as: user,
        body: {
          id: sessionId,
          runId: run.id,
          startPage: 10,
          endPage: 50,
          startTime: now.toISOString(),
          endTime: later.toISOString(),
          readTime: 1800,
        },
      });

      expect(response.status).toBe(201);

      const runRow = await db
        .selectFrom("readingRun")
        .selectAll()
        .where("id", "=", run.id)
        .executeTakeFirstOrThrow();
      expect(runRow.completedPages).toBe(50);
      expect(runRow.finishedAt).toBeNull();

      const sessionRow = await db
        .selectFrom("readingSession")
        .selectAll()
        .where("id", "=", sessionId)
        .executeTakeFirstOrThrow();
      expect(sessionRow.readPages).toBe(40);
      expect(sessionRow.userId).toBe(user.id);
    });

    it("auto-finishes the run when endPage reaches totalPages", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 120 });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 100,
      });

      const now = new Date();
      const response = await call("POST", "/api/reading-sessions", {
        as: user,
        body: {
          id: uuidv7(),
          runId: run.id,
          startPage: 100,
          endPage: 120,
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + 60_000).toISOString(),
          readTime: 60,
        },
      });

      expect(response.status).toBe(201);

      const runRow = await db
        .selectFrom("readingRun")
        .selectAll()
        .where("id", "=", run.id)
        .executeTakeFirstOrThrow();
      expect(runRow.completedPages).toBe(120);
      expect(runRow.finishedAt).not.toBeNull();
    });

    it("rejects endPage beyond totalPages with 400", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 100 });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 10,
      });

      const now = new Date();
      const response = await call("POST", "/api/reading-sessions", {
        as: user,
        body: {
          id: uuidv7(),
          runId: run.id,
          startPage: 10,
          endPage: 999,
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + 60_000).toISOString(),
          readTime: 60,
        },
      });

      expect(response.status).toBe(400);
    });

    it("returns 404 for a missing runId", async () => {
      const user = await makeUser();

      const now = new Date();
      const response = await call("POST", "/api/reading-sessions", {
        as: user,
        body: {
          id: uuidv7(),
          runId: uuidv7(),
          startPage: 1,
          endPage: 10,
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + 60_000).toISOString(),
          readTime: 60,
        },
      });

      expect(response.status).toBe(404);
    });

    it("is atomic: a duplicate session id leaves the run unchanged", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 500 });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 10,
      });

      const sessionId = uuidv7();
      const now = new Date();
      const makeRequest = (endPage: number) =>
        call("POST", "/api/reading-sessions", {
          as: user,
          body: {
            id: sessionId,
            runId: run.id,
            startPage: 10,
            endPage,
            startTime: now.toISOString(),
            endTime: new Date(now.getTime() + 60_000).toISOString(),
            readTime: 60,
          },
        });

      const first = await makeRequest(50);
      expect(first.status).toBe(201);

      const second = await makeRequest(200);
      expect(second.ok).toBe(false);

      const runRow = await db
        .selectFrom("readingRun")
        .selectAll()
        .where("id", "=", run.id)
        .executeTakeFirstOrThrow();
      expect(runRow.completedPages).toBe(50);

      const sessions = await db
        .selectFrom("readingSession")
        .selectAll()
        .where("runId", "=", run.id)
        .execute();
      expect(sessions).toHaveLength(1);
    });
  });

  describe("PUT /api/reading-sessions/:sessionId", () => {
    it("syncs the run totals when updateRun is true", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 300 });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 50,
      });
      const session = await makeSession({
        userId: user.id,
        runId: run.id,
        startPage: 10,
        endPage: 50,
      });

      const response = await call(
        "PUT",
        `/api/reading-sessions/${session.id}`,
        {
          as: user,
          body: { endPage: 80, updateRun: true },
        },
      );

      expect(response.status).toBe(200);

      const runRow = await db
        .selectFrom("readingRun")
        .selectAll()
        .where("id", "=", run.id)
        .executeTakeFirstOrThrow();
      expect(runRow.completedPages).toBe(80);
    });

    it("does not change the run when updateRun is false", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 300 });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 50,
      });
      const session = await makeSession({
        userId: user.id,
        runId: run.id,
        startPage: 10,
        endPage: 50,
      });

      const response = await call(
        "PUT",
        `/api/reading-sessions/${session.id}`,
        {
          as: user,
          body: { endPage: 80, updateRun: false },
        },
      );

      expect(response.status).toBe(200);

      const runRow = await db
        .selectFrom("readingRun")
        .selectAll()
        .where("id", "=", run.id)
        .executeTakeFirstOrThrow();
      expect(runRow.completedPages).toBe(50);
    });

    it("rejects endPage beyond totalPages with 400", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, totalPages: 100 });
      const run = await makeRun({ userId: user.id, bookId: book.id });
      const session = await makeSession({ userId: user.id, runId: run.id });

      const response = await call(
        "PUT",
        `/api/reading-sessions/${session.id}`,
        {
          as: user,
          body: { endPage: 999, updateRun: true },
        },
      );

      expect(response.status).toBe(400);
    });

    it("returns 404 for a missing session", async () => {
      const user = await makeUser();

      const response = await call(
        "PUT",
        `/api/reading-sessions/${uuidv7()}`,
        {
          as: user,
          body: { updateRun: false },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/reading-sessions/:sessionId", () => {
    it("deletes only the caller's session", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });
      const run = await makeRun({ userId: user.id, bookId: book.id });
      const session = await makeSession({ userId: user.id, runId: run.id });

      const first = await call(
        "DELETE",
        `/api/reading-sessions/${session.id}`,
        { as: user },
      );
      expect(first.status).toBe(204);

      const second = await call(
        "DELETE",
        `/api/reading-sessions/${session.id}`,
        { as: user },
      );
      expect(second.status).toBe(404);
    });
  });
});
