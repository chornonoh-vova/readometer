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

describe("/api/reading-runs", () => {
  describe("authorization", () => {
    it.each([
      ["GET", "/api/reading-runs?bookId=01999999-9999-7999-8999-999999999999"],
      ["POST", "/api/reading-runs"],
      ["PUT", "/api/reading-runs/01999999-9999-7999-8999-999999999999"],
      ["DELETE", "/api/reading-runs/01999999-9999-7999-8999-999999999999"],
    ])("%s %s returns 401 without auth", async (method, path) => {
      const response = await call(method, path);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/reading-runs", () => {
    it("filters by book and scope to the caller, ordered by updatedAt desc", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const book = await makeBook({ userId: user.id });
      const otherBook = await makeBook({ userId: user.id });

      const older = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 1,
      });
      await new Promise((r) => setTimeout(r, 10));
      const newer = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 2,
      });

      await makeRun({ userId: user.id, bookId: otherBook.id });
      await makeRun({ userId: other.id, bookId: book.id });

      const response = await call(
        "GET",
        `/api/reading-runs?bookId=${book.id}`,
        { as: user },
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ id: string }>;
      expect(body.map((r) => r.id)).toEqual([newer.id, older.id]);
    });
  });

  describe("POST /api/reading-runs", () => {
    it("creates a run for the caller's book", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const id = uuidv7();
      const response = await call("POST", "/api/reading-runs", {
        as: user,
        body: {
          id,
          bookId: book.id,
          completedPages: 10,
          startedAt: new Date().toISOString(),
        },
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string; userId: string };
      expect(body.id).toBe(id);
      expect(body.userId).toBe(user.id);
    });

    it("rejects zero completedPages", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const response = await call("POST", "/api/reading-runs", {
        as: user,
        body: {
          id: uuidv7(),
          bookId: book.id,
          completedPages: 0,
          startedAt: new Date().toISOString(),
        },
      });

      expect(response.status).toBe(400);
    });

    it("silently accepts a bookId belonging to another user (route does not verify ownership)", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const otherBook = await makeBook({ userId: other.id });

      const response = await call("POST", "/api/reading-runs", {
        as: user,
        body: {
          id: uuidv7(),
          bookId: otherBook.id,
          completedPages: 1,
          startedAt: new Date().toISOString(),
        },
      });

      expect(response.status).toBe(201);
    });
  });

  describe("PUT /api/reading-runs/:runId", () => {
    it("updates completedPages and finishedAt", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 10,
      });

      const finishedAt = new Date().toISOString();
      const response = await call("PUT", `/api/reading-runs/${run.id}`, {
        as: user,
        body: { completedPages: 50, finishedAt },
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        completedPages: number;
        finishedAt: string | null;
      };
      expect(body.completedPages).toBe(50);
      expect(body.finishedAt).not.toBeNull();
    });

    it("returns 404 when updating another user's run", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const book = await makeBook({ userId: other.id });
      const run = await makeRun({ userId: other.id, bookId: book.id });

      const response = await call("PUT", `/api/reading-runs/${run.id}`, {
        as: user,
        body: { completedPages: 99 },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/reading-runs/:runId", () => {
    it("cascades to sessions and 404s on repeat", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });
      const run = await makeRun({ userId: user.id, bookId: book.id });
      await makeSession({ userId: user.id, runId: run.id });

      const first = await call("DELETE", `/api/reading-runs/${run.id}`, {
        as: user,
      });
      expect(first.status).toBe(204);

      const sessions = await db
        .selectFrom("readingSession")
        .selectAll()
        .where("runId", "=", run.id)
        .execute();
      expect(sessions).toHaveLength(0);

      const second = await call("DELETE", `/api/reading-runs/${run.id}`, {
        as: user,
      });
      expect(second.status).toBe(404);
    });
  });
});
