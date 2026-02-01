import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types.ts";
import { db } from "../lib/database.ts";
import { zValidator } from "../lib/validator.ts";
import z from "zod";
import { isbnSchema, normalizeIsbnToIsbn13 } from "../lib/isbn.ts";
import { sql } from "kysely";

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
          .select(["bookId", "completedPages", "updatedAt"])
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
    ])
    .where("userId", "=", userId)
    .orderBy("lastUpdatedAt", "desc");

  const allBooks = await booksQuery.execute();

  return c.json(allBooks);
});

const bookSchema = z.object({
  bookId: z.uuidv7(),
});

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
    throw new HTTPException(404);
  }

  return c.json(found);
});

const createBookSchema = z.object({
  id: z.uuidv7(),
  title: z.string().trim().nonempty(),
  description: z.string().trim().optional(),
  author: z.string().trim().optional(),
  totalPages: z.number().positive(),
  publishDate: z.iso.date().optional(),
  isbn: isbnSchema,
  language: z.string().trim().optional(),
});

books.post("/", zValidator("json", createBookSchema), async (c) => {
  const userId = c.get("user")!.id;
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
      publishDate: request.publishDate
        ? new Date(request.publishDate)
        : undefined,
      isbn13: normalizeIsbnToIsbn13(request.isbn),
      language: request.language,
    })
    .returningAll();

  const result = await createBookQuery.executeTakeFirst();

  c.status(201);
  return c.json(result);
});

const updateBookSchema = z.object({
  title: z.string().trim().nonempty().optional(),
  description: z.string().trim().optional(),
  author: z.string().trim().optional(),
  totalPages: z.number().positive().optional(),
  publishDate: z.iso.date().optional(),
  isbn: isbnSchema.optional(),
  language: z.string().trim().optional(),
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
        publishDate: request.publishDate
          ? new Date(request.publishDate)
          : undefined,
        isbn13: request.isbn ? normalizeIsbnToIsbn13(request.isbn) : undefined,
        language: request.language,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", bookId)
      .where("userId", "=", userId)
      .returningAll();

    const result = await updateBookQuery.executeTakeFirst();

    if (!result) {
      throw new HTTPException(404);
    }

    c.status(200);
    return c.json(result);
  },
);

books.delete("/:bookId", zValidator("param", bookSchema), async (c) => {
  const userId = c.get("user")!.id;
  const bookId = c.req.valid("param").bookId;

  const deleteBookQuery = db
    .deleteFrom("book")
    .where("id", "=", bookId)
    .where("userId", "=", userId);

  const result = await deleteBookQuery.executeTakeFirst();

  if (!result.numDeletedRows) {
    throw new HTTPException(404);
  }

  return c.status(204);
});

export default books;
