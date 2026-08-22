import { db } from "./database.ts";
import { auth } from "./auth.ts";
import { removeCoverFiles } from "./covers.ts";

export type ModeratedUser = {
  id: string;
  email: string;
  name: string;
  banned: boolean;
  createdAt: Date;
};

export type ContentCounts = {
  books: number;
  goals: number;
  covers: number;
};

/** Whether this account is banned. Backend-only; never exposed to a client. */
export async function isBanned(userId: string): Promise<boolean> {
  const row = await db
    .selectFrom("user")
    .select("banned")
    .where("id", "=", userId)
    .executeTakeFirst();

  return row?.banned ?? false;
}

const moderatedColumns = [
  "id",
  "email",
  "name",
  "banned",
  "createdAt",
] as const;

export async function findUsers(
  identifiers: string[],
): Promise<ModeratedUser[]> {
  if (identifiers.length === 0) return [];

  return db
    .selectFrom("user")
    .select(moderatedColumns)
    .where((eb) =>
      eb.or([eb("id", "in", identifiers), eb("email", "in", identifiers)]),
    )
    .execute();
}

export async function listBannedUsers(): Promise<ModeratedUser[]> {
  return db
    .selectFrom("user")
    .select(moderatedColumns)
    .where("banned", "=", true)
    .orderBy("createdAt")
    .execute();
}

export async function banUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  await db
    .updateTable("user")
    .set({ banned: true, updatedAt: new Date() })
    .where("id", "in", userIds)
    .execute();

  // Without this the ban only bites once the Redis session blob expires.
  const { internalAdapter } = await auth.$context;
  for (const userId of userIds) {
    await internalAdapter.deleteUserSessions(userId);
  }
}

async function coverIdsOf(userIds: string[]): Promise<string[]> {
  const rows = await db
    .selectFrom("book")
    .select("coverId")
    .where("userId", "in", userIds)
    .where("coverId", "is not", null)
    .execute();

  return rows.map((row) => row.coverId as string);
}

export async function countUserContent(
  userIds: string[],
): Promise<ContentCounts> {
  if (userIds.length === 0) return { books: 0, goals: 0, covers: 0 };

  const [books, goals, covers] = await Promise.all([
    db
      .selectFrom("book")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("userId", "in", userIds)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("goal")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("userId", "in", userIds)
      .executeTakeFirstOrThrow(),
    coverIdsOf(userIds),
  ]);

  return {
    books: Number(books.count),
    goals: Number(goals.count),
    covers: covers.length,
  };
}

/**
 * Deletes everything a user produced, keeping the account itself so the ban and
 * the burned email address survive. `readingRun` and `readingSession` cascade
 * from `book`.
 */
export async function purgeUserContent(
  userIds: string[],
): Promise<ContentCounts> {
  if (userIds.length === 0) return { books: 0, goals: 0, covers: 0 };

  const coverIds = await coverIdsOf(userIds);

  const books = await db
    .deleteFrom("book")
    .where("userId", "in", userIds)
    .executeTakeFirst();

  const goals = await db
    .deleteFrom("goal")
    .where("userId", "in", userIds)
    .executeTakeFirst();

  await Promise.all(coverIds.map(removeCoverFiles));

  return {
    books: Number(books.numDeletedRows),
    goals: Number(goals.numDeletedRows),
    covers: coverIds.length,
  };
}
