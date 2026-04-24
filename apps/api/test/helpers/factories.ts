import { randomUUID } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../src/lib/database";

export type TestUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function makeUser(
  overrides: Partial<TestUser> = {},
): Promise<TestUser> {
  const now = new Date();
  const user: TestUser = {
    id: overrides.id ?? randomUUID(),
    email: overrides.email ?? `u-${randomUUID()}@example.com`,
    name: overrides.name ?? "Test User",
    emailVerified: overrides.emailVerified ?? true,
    image: overrides.image ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
  await db.insertInto("user").values(user).execute();
  return user;
}

type MakeBookInput = {
  userId: string;
  id?: string;
  title?: string;
  description?: string | null;
  author?: string | null;
  totalPages?: number;
  publishDate?: Date | null;
  isbn13?: string | null;
  language?: string | null;
  coverId?: string | null;
  coverColor?: string | null;
};

export async function makeBook(input: MakeBookInput) {
  return db
    .insertInto("book")
    .values({
      id: input.id ?? uuidv7(),
      userId: input.userId,
      title: input.title ?? "Test Book",
      description: input.description ?? null,
      author: input.author ?? null,
      totalPages: input.totalPages ?? 300,
      publishDate: input.publishDate ?? null,
      isbn13: input.isbn13 ?? null,
      language: input.language ?? null,
      coverId: input.coverId ?? null,
      coverColor: input.coverColor ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

type MakeRunInput = {
  userId: string;
  bookId: string;
  id?: string;
  completedPages?: number;
  startedAt?: Date;
  finishedAt?: Date | null;
};

export async function makeRun(input: MakeRunInput) {
  return db
    .insertInto("readingRun")
    .values({
      id: input.id ?? uuidv7(),
      userId: input.userId,
      bookId: input.bookId,
      completedPages: input.completedPages ?? 1,
      startedAt: input.startedAt ?? new Date(),
      finishedAt: input.finishedAt ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

type MakeSessionInput = {
  userId: string;
  runId: string;
  id?: string;
  startPage?: number;
  endPage?: number;
  readPages?: number;
  startTime?: Date;
  endTime?: Date | null;
  readTime?: number;
};

export async function makeSession(input: MakeSessionInput) {
  const start = input.startPage ?? 1;
  const end = input.endPage ?? 10;
  const now = input.startTime ?? new Date();
  return db
    .insertInto("readingSession")
    .values({
      id: input.id ?? uuidv7(),
      userId: input.userId,
      runId: input.runId,
      startPage: start,
      endPage: end,
      readPages: input.readPages ?? end - start,
      startTime: now,
      endTime: input.endTime ?? now,
      readTime: input.readTime ?? 600,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
