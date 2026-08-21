import { Hono } from "hono";
import { endTime, startTime } from "hono/timing";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";
import type { AppEnv } from "../types.ts";
import { db } from "../lib/database.ts";
import { zValidator } from "../lib/validator.ts";
import z from "zod";
import { isbnSchema, normalizeIsbnToIsbn13 } from "isbn";
import { FIELD_LIMITS } from "../lib/limits.ts";
import { assertBookQuota } from "../lib/quota.ts";
import { removeCoverFiles } from "../lib/covers.ts";

const books = new Hono<AppEnv>();

books.get("/", async (c) => {
  const userId = c.get("user")!.id;

  const booksQuery = db
    .selectFrom("book")
    .selectAll("book")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("readingRun")
          .select((eb) => [
            eb.ref("id").as("runId"),
            "bookId",
            "completedPages",
            "updatedAt",
            "abandoned",
          ])
          .whereRef("bookId", "=", "book.id")
          .orderBy("id", "desc")
          .limit(1)
          .as("readingRun"),
      (join) => join.onRef("readingRun.bookId", "=", "book.id"),
    )
    .select((eb) => [
      eb.fn
        .coalesce("readingRun.completedPages", eb.lit(0))
        .as("completedPages"),
      eb.fn
        .coalesce("readingRun.updatedAt", "book.updatedAt")
        .as("lastUpdatedAt"),
      eb.ref("readingRun.runId").as("lastRunId"),
      "readingRun.abandoned",
    ])
    .where("userId", "=", userId)
    .orderBy("lastUpdatedAt", "desc");

  startTime(c, "db");
  const allBooks = await booksQuery.execute();
  endTime(c, "db");

  return c.json(allBooks);
});

const bookSchema = z.object({
  bookId: z.uuidv7(),
});

const partialDateSchema = z.string().refine((value) => {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  if (year < 1 || year > 9999) return false;
  if (match[2] === undefined) return true;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;
  if (match[3] === undefined) return true;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}, "Expected YYYY, YYYY-MM, or YYYY-MM-DD");

books.get("/:bookId", zValidator("param", bookSchema), async (c) => {
  const userId = c.get("user")!.id;
  const bookId = c.req.valid("param").bookId;

  const bookQuery = db
    .selectFrom("book")
    .selectAll()
    .where("id", "=", bookId)
    .where("userId", "=", userId);

  const found = await bookQuery.executeTakeFirst();

  if (!found) {
    throw new HTTPException(404, { message: "Book not found" });
  }

  return c.json(found);
});

const createBookSchema = z.object({
  id: z.uuidv7(),
  title: z.string().trim().nonempty().max(FIELD_LIMITS.bookTitle),
  description: z.string().trim().max(FIELD_LIMITS.bookDescription).optional(),
  author: z.string().trim().max(FIELD_LIMITS.bookAuthor).optional(),
  totalPages: z.number().int().positive().max(FIELD_LIMITS.pages),
  publishDate: partialDateSchema.optional(),
  isbn: isbnSchema.optional(),
  // `book.language` is char(2); without this the DB raises a 500, not a 400.
  language: z.string().trim().length(2).optional(),
});

books.post("/", zValidator("json", createBookSchema), async (c) => {
  const userId = c.get("user")!.id;
  await assertBookQuota(userId);

  const request = c.req.valid("json");

  const createBookQuery = db
    .insertInto("book")
    .values({
      id: request.id,
      userId,
      title: request.title,
      description: request.description,
      author: request.author,
      totalPages: request.totalPages,
      publishDate: request.publishDate,
      isbn13: normalizeIsbnToIsbn13(request.isbn),
      language: request.language,
    })
    .returningAll();

  const result = await createBookQuery.executeTakeFirst();

  return c.json(result, 201);
});

const updateBookSchema = z.object({
  title: z.string().trim().nonempty().max(FIELD_LIMITS.bookTitle).optional(),
  description: z.string().trim().max(FIELD_LIMITS.bookDescription).optional(),
  author: z.string().trim().max(FIELD_LIMITS.bookAuthor).optional(),
  totalPages: z.number().int().positive().max(FIELD_LIMITS.pages).optional(),
  publishDate: partialDateSchema.optional(),
  isbn: isbnSchema.optional(),
  language: z.string().trim().length(2).optional(),
});

books.put(
  "/:bookId",
  zValidator("param", bookSchema),
  zValidator("json", updateBookSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const bookId = c.req.valid("param").bookId;

    const request = c.req.valid("json");

    const updateBookQuery = db
      .updateTable("book")
      .set({
        title: request.title,
        description: request.description,
        author: request.author,
        totalPages: request.totalPages,
        publishDate: request.publishDate,
        isbn13: request.isbn ? normalizeIsbnToIsbn13(request.isbn) : undefined,
        language: request.language,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", bookId)
      .where("userId", "=", userId)
      .returningAll();

    const result = await updateBookQuery.executeTakeFirst();

    if (!result) {
      throw new HTTPException(404, { message: "Book not found" });
    }

    return c.json(result);
  },
);

books.delete("/:bookId", zValidator("param", bookSchema), async (c) => {
  const userId = c.get("user")!.id;
  const bookId = c.req.valid("param").bookId;

  // `returning` instead of numDeletedRows: the cascade drops the child rows but
  // nothing removed the cover files, so they leaked on STORAGE_PATH forever.
  const deleteBookQuery = db
    .deleteFrom("book")
    .where("id", "=", bookId)
    .where("userId", "=", userId)
    .returning("coverId");

  const result = await deleteBookQuery.executeTakeFirst();

  if (!result) {
    throw new HTTPException(404, { message: "Book not found" });
  }

  if (result.coverId) {
    await removeCoverFiles(result.coverId);
  }

  return c.body(null, 204);
});

export default books;
