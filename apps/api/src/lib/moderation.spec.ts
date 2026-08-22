import { describe, it, expect } from "vitest";
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import {
  banUsers,
  countUserContent,
  findUsers,
  isBanned,
  listBannedUsers,
  purgeUserContent,
} from "./moderation";
import { coverPath } from "./covers";
import { auth } from "./auth";
import { db } from "./database";
import {
  makeUser,
  makeBook,
  makeRun,
  makeSession,
} from "../../test/helpers/factories";
import { call } from "../../test/helpers/request";

const CAPTCHA_HEADERS = { "x-captcha-response": "test-response" };

async function makeGoal(userId: string) {
  return db
    .insertInto("goal")
    .values({
      id: crypto.randomUUID(),
      userId,
      type: "yearly",
      metric: "books",
      target: 12,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

async function makeCoverFiles(coverId: string) {
  await mkdir(dirname(coverPath(coverId, "sm")), { recursive: true });
  await writeFile(coverPath(coverId, "sm"), "sm");
  await writeFile(coverPath(coverId, "md"), "md");
}

async function exists(path: string) {
  return access(path).then(
    () => true,
    () => false,
  );
}

describe("findUsers", () => {
  it("resolves an identifier that is an email", async () => {
    const user = await makeUser({ email: "target@example.com" });

    expect(await findUsers(["target@example.com"])).toEqual([
      expect.objectContaining({ id: user.id }),
    ]);
  });

  it("resolves an identifier that is a user id", async () => {
    const user = await makeUser();

    expect(await findUsers([user.id])).toEqual([
      expect.objectContaining({ id: user.id }),
    ]);
  });

  it("returns nothing for an identifier that matches no one", async () => {
    await makeUser();

    expect(await findUsers(["nobody@example.com"])).toEqual([]);
  });
});

describe("banUsers", () => {
  it("marks the user banned", async () => {
    const user = await makeUser();

    await banUsers([user.id]);

    expect(await isBanned(user.id)).toBe(true);
  });

  it("leaves other users alone", async () => {
    const target = await makeUser();
    const bystander = await makeUser();

    await banUsers([target.id]);

    expect(await isBanned(bystander.id)).toBe(false);
  });

  it("revokes the banned user's live sessions", async () => {
    const email = `live-${crypto.randomUUID()}@gmail.com`;
    const password = "correct-horse-battery-staple";

    await call("POST", "/api/auth/sign-up/email", {
      body: { name: "Reader", email, password },
      headers: CAPTCHA_HEADERS,
    });
    await db
      .updateTable("user")
      .set({ emailVerified: true })
      .where("email", "=", email)
      .execute();
    await call("POST", "/api/auth/sign-in/email", {
      body: { email, password },
      headers: CAPTCHA_HEADERS,
    });

    const { id } = await db
      .selectFrom("user")
      .select("id")
      .where("email", "=", email)
      .executeTakeFirstOrThrow();
    const ctx = await auth.$context;
    expect(await ctx.internalAdapter.listSessions(id)).toHaveLength(1);

    await banUsers([id]);

    expect(await ctx.internalAdapter.listSessions(id)).toHaveLength(0);
  });
});

describe("listBannedUsers", () => {
  it("returns only the banned accounts", async () => {
    const banned = await makeUser({ banned: true });
    await makeUser({ banned: false });

    expect(await listBannedUsers()).toEqual([
      expect.objectContaining({ id: banned.id }),
    ]);
  });
});

describe("countUserContent", () => {
  it("counts books, goals and covers without deleting anything", async () => {
    const user = await makeUser();
    await makeBook({ userId: user.id, coverId: crypto.randomUUID() });
    await makeBook({ userId: user.id });
    await makeGoal(user.id);

    expect(await countUserContent([user.id])).toEqual({
      books: 2,
      goals: 1,
      covers: 1,
    });

    const remaining = await db.selectFrom("book").selectAll().execute();
    expect(remaining).toHaveLength(2);
  });
});

describe("purgeUserContent", () => {
  it("deletes the user's books and the runs and sessions under them", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });
    const run = await makeRun({ userId: user.id, bookId: book.id });
    await makeSession({ userId: user.id, runId: run.id });

    await purgeUserContent([user.id]);

    expect(await db.selectFrom("book").selectAll().execute()).toEqual([]);
    expect(await db.selectFrom("readingRun").selectAll().execute()).toEqual([]);
    expect(await db.selectFrom("readingSession").selectAll().execute()).toEqual(
      [],
    );
  });

  it("deletes the user's goals", async () => {
    const user = await makeUser();
    await makeGoal(user.id);

    await purgeUserContent([user.id]);

    expect(await db.selectFrom("goal").selectAll().execute()).toEqual([]);
  });

  it("removes the cover files of the deleted books", async () => {
    const user = await makeUser();
    const coverId = crypto.randomUUID();
    await makeCoverFiles(coverId);
    await makeBook({ userId: user.id, coverId });

    await purgeUserContent([user.id]);

    expect(await exists(coverPath(coverId, "sm"))).toBe(false);
    expect(await exists(coverPath(coverId, "md"))).toBe(false);
  });

  it("keeps the user row so the ban and the burned address survive", async () => {
    const user = await makeUser({ banned: true });
    await makeBook({ userId: user.id });

    await purgeUserContent([user.id]);

    expect(await isBanned(user.id)).toBe(true);
  });

  it("leaves another user's content untouched", async () => {
    const target = await makeUser();
    const bystander = await makeUser();
    await makeBook({ userId: target.id });
    await makeBook({ userId: bystander.id });
    await makeGoal(bystander.id);

    await purgeUserContent([target.id]);

    const books = await db.selectFrom("book").select("userId").execute();
    expect(books).toEqual([{ userId: bystander.id }]);
    expect(await db.selectFrom("goal").selectAll().execute()).toHaveLength(1);
  });

  it("reports nothing to do on a second run", async () => {
    const user = await makeUser();
    await makeBook({ userId: user.id, coverId: crypto.randomUUID() });
    await makeGoal(user.id);

    await purgeUserContent([user.id]);

    expect(await purgeUserContent([user.id])).toEqual({
      books: 0,
      goals: 0,
      covers: 0,
    });
  });
});
