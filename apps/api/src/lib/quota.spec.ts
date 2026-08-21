import { describe, it, expect } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { call } from "../../test/helpers/request";
import { makeUser, makeBook, makeRun } from "../../test/helpers/factories";
import { QUOTAS } from "./limits";
import { db } from "./database";

/** Seeded in bulk: individual factory calls would dominate the suite runtime. */
function seedBooks(userId: string, count: number) {
  return db
    .insertInto("book")
    .values(
      Array.from({ length: count }, () => ({
        id: uuidv7(),
        userId,
        title: "Seeded",
        totalPages: 300,
      })),
    )
    .execute();
}

function seedSessions(userId: string, runId: string, count: number) {
  return db
    .insertInto("readingSession")
    .values(
      Array.from({ length: count }, () => ({
        id: uuidv7(),
        userId,
        runId,
        startPage: 1,
        endPage: 10,
        readPages: 9,
        startTime: new Date(),
        endTime: new Date(),
        readTime: 600,
      })),
    )
    .execute();
}

describe("book quota", () => {
  it("rejects a new book once the per-user ceiling is reached", async () => {
    const user = await makeUser();
    await seedBooks(user.id, QUOTAS.booksPerUser);

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "One too many", totalPages: 300 },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("Book limit reached");
  });

  it("allows a new book one below the ceiling", async () => {
    const user = await makeUser();
    await seedBooks(user.id, QUOTAS.booksPerUser - 1);

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Just fits", totalPages: 300 },
    });

    expect(response.status).toBe(201);
  });

  it("counts each user's books separately", async () => {
    const [user, other] = await Promise.all([makeUser(), makeUser()]);
    await seedBooks(other.id, QUOTAS.booksPerUser);
    await makeBook({ userId: user.id });

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Mine", totalPages: 300 },
    });

    expect(response.status).toBe(201);
  });
});

describe("run quota", () => {
  it("rejects a new run once the per-book ceiling is reached", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });

    for (let i = 0; i < QUOTAS.runsPerBook; i++) {
      await makeRun({ userId: user.id, bookId: book.id });
    }

    const response = await call("POST", "/api/reading-runs", {
      as: user,
      body: {
        id: uuidv7(),
        bookId: book.id,
        completedPages: 0,
        startedAt: new Date().toISOString(),
      },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("Reading run limit reached");
  });

  it("scopes the run ceiling to one book, not the whole library", async () => {
    const user = await makeUser();
    const [full, fresh] = await Promise.all([
      makeBook({ userId: user.id }),
      makeBook({ userId: user.id }),
    ]);

    for (let i = 0; i < QUOTAS.runsPerBook; i++) {
      await makeRun({ userId: user.id, bookId: full.id });
    }

    const response = await call("POST", "/api/reading-runs", {
      as: user,
      body: {
        id: uuidv7(),
        bookId: fresh.id,
        completedPages: 0,
        startedAt: new Date().toISOString(),
      },
    });

    expect(response.status).toBe(201);
  });
});

describe("session quota", () => {
  const sessionBody = (runId: string) => ({
    id: uuidv7(),
    runId,
    startPage: 1,
    endPage: 10,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    readTime: 600,
  });

  it("rejects a new session once the per-run ceiling is reached", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 300 });
    const run = await makeRun({ userId: user.id, bookId: book.id });
    await seedSessions(user.id, run.id, QUOTAS.sessionsPerRun);

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: sessionBody(run.id),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("session limit reached");
  });

  it("rejects a new session once the per-user ceiling is reached, even on a fresh run", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 300 });
    const filler = await makeRun({ userId: user.id, bookId: book.id });
    const fresh = await makeRun({ userId: user.id, bookId: book.id });
    await seedSessions(user.id, filler.id, QUOTAS.sessionsPerUser);

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: sessionBody(fresh.id),
    });

    expect(response.status).toBe(403);
  });

  it("allows a session below both ceilings", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 300 });
    const run = await makeRun({ userId: user.id, bookId: book.id });

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: sessionBody(run.id),
    });

    expect(response.status).toBe(201);
  });
});
