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

describe("/api/books", () => {
  describe("authorization", () => {
    it.each([
      ["GET", "/api/books"],
      ["GET", "/api/books/01999999-9999-7999-8999-999999999999"],
      ["POST", "/api/books"],
      ["PUT", "/api/books/01999999-9999-7999-8999-999999999999"],
      ["DELETE", "/api/books/01999999-9999-7999-8999-999999999999"],
    ])("%s %s returns 401 without auth", async (method, path) => {
      const response = await call(method, path);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/books", () => {
    it("returns only the caller's books ordered by last update", async () => {
      const user = await makeUser();
      const other = await makeUser();

      const older = await makeBook({ userId: user.id, title: "Older" });
      const newer = await makeBook({ userId: user.id, title: "Newer" });
      await makeBook({ userId: other.id, title: "Other" });

      await makeRun({ userId: user.id, bookId: newer.id, completedPages: 42 });

      const response = await call("GET", "/api/books", { as: user });

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{
        id: string;
        title: string;
        completedPages: number;
      }>;

      expect(body.map((b) => b.title)).toEqual(["Newer", "Older"]);
      const newerRow = body.find((b) => b.id === newer.id)!;
      const olderRow = body.find((b) => b.id === older.id)!;
      expect(newerRow.completedPages).toBe(42);
      expect(olderRow.completedPages).toBe(0);
    });
  });

  describe("GET /api/books/:bookId", () => {
    it("returns the book owned by the caller", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id, title: "Mine" });

      const response = await call("GET", `/api/books/${book.id}`, { as: user });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { id: string; title: string };
      expect(body.id).toBe(book.id);
      expect(body.title).toBe("Mine");
    });

    it("returns 404 for a book that belongs to another user", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const book = await makeBook({ userId: other.id });

      const response = await call("GET", `/api/books/${book.id}`, { as: user });

      expect(response.status).toBe(404);
    });

    it("returns 404 for a missing book", async () => {
      const user = await makeUser();

      const response = await call(
        "GET",
        `/api/books/${uuidv7()}`,
        { as: user },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/books", () => {
    it("creates a book and persists ISBN-10 as ISBN-13", async () => {
      const user = await makeUser();

      const id = uuidv7();
      const response = await call("POST", "/api/books", {
        as: user,
        body: {
          id,
          title: "The C Programming Language",
          totalPages: 272,
          isbn: "0-13-110362-8",
        },
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as { isbn13: string; id: string };
      expect(body.id).toBe(id);
      expect(body.isbn13).toBe("9780131103627");

      const row = await db
        .selectFrom("book")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirstOrThrow();
      expect(row.isbn13).toBe("9780131103627");
      expect(row.userId).toBe(user.id);
    });

    it("rejects a request missing title", async () => {
      const user = await makeUser();

      const response = await call("POST", "/api/books", {
        as: user,
        body: { id: uuidv7(), totalPages: 100 },
      });

      expect(response.status).toBe(400);
    });

    it("rejects a request with non-positive totalPages", async () => {
      const user = await makeUser();

      const response = await call("POST", "/api/books", {
        as: user,
        body: { id: uuidv7(), title: "x", totalPages: 0 },
      });

      expect(response.status).toBe(400);
    });

    it("rejects a request with an invalid ISBN", async () => {
      const user = await makeUser();

      const response = await call("POST", "/api/books", {
        as: user,
        body: {
          id: uuidv7(),
          title: "x",
          totalPages: 100,
          isbn: "not-an-isbn",
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/books/:bookId", () => {
    it("partially updates the book and bumps updatedAt", async () => {
      const user = await makeUser();
      const book = await makeBook({
        userId: user.id,
        title: "Old title",
        totalPages: 100,
      });

      await new Promise((r) => setTimeout(r, 10));

      const response = await call("PUT", `/api/books/${book.id}`, {
        as: user,
        body: { title: "New title" },
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        title: string;
        totalPages: number;
        updatedAt: string;
      };
      expect(body.title).toBe("New title");
      expect(body.totalPages).toBe(100);
      expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
        new Date(book.updatedAt).getTime(),
      );
    });

    it("returns 404 when updating a book owned by another user", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const book = await makeBook({ userId: other.id });

      const response = await call("PUT", `/api/books/${book.id}`, {
        as: user,
        body: { title: "hacked" },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/books/:bookId", () => {
    it("cascades to runs and sessions and returns 404 on repeat", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });
      const run = await makeRun({
        userId: user.id,
        bookId: book.id,
        completedPages: 5,
      });
      await makeSession({ userId: user.id, runId: run.id });

      const first = await call("DELETE", `/api/books/${book.id}`, { as: user });
      expect(first.status).toBe(204);

      const runs = await db
        .selectFrom("readingRun")
        .selectAll()
        .where("bookId", "=", book.id)
        .execute();
      expect(runs).toHaveLength(0);

      const sessions = await db
        .selectFrom("readingSession")
        .selectAll()
        .where("runId", "=", run.id)
        .execute();
      expect(sessions).toHaveLength(0);

      const second = await call("DELETE", `/api/books/${book.id}`, {
        as: user,
      });
      expect(second.status).toBe(404);
    });
  });
});
