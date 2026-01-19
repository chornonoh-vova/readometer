import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Expression } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import type { AppEnv } from "../types.ts";
import { db } from "../lib/database.ts";
import { zValidator } from "../lib/validator.ts";
import z from "zod";
import { isbnSchema, normalizeIsbnToIsbn13 } from "../lib/isbn.ts";

const books = new Hono<AppEnv>();

function readingRuns(bookId: Expression<string>) {
  return jsonArrayFrom(
    db
      .selectFrom("readingRun")
      .selectAll()
      .whereRef("readingRun.bookId", "=", bookId)
      .orderBy("updatedAt"),
  ).as("readingRuns");
}

books.get("/", async (c) => {
  const userId = c.get("user")!.id;

  const booksQuery = db
    .selectFrom("book")
    .selectAll()
    .select(({ ref }) => [readingRuns(ref("book.id"))])
    .where("userId", "=", userId)
    .orderBy("updatedAt", "desc");

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
    .select(({ ref }) => [readingRuns(ref("book.id"))])
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
  title: z.string().nonempty(),
  description: z.string().optional(),
  author: z.string().optional(),
  totalPages: z.number().positive(),
  publishDate: z.iso.date().optional(),
  isbn: isbnSchema,
  language: z.string().optional(),
  updatedAt: z.iso.datetime(),
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
      updatedAt: new Date(request.updatedAt),
    })
    .returningAll();

  const result = await createBookQuery.executeTakeFirst();

  c.status(201);
  return c.json(result);
});

const updateBookSchema = z.object({
  title: z.string().nonempty().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  totalPages: z.number().positive().optional(),
  publishDate: z.iso.date().optional(),
  isbn: isbnSchema.optional(),
  language: z.string().optional(),
  updatedAt: z.iso.datetime(),
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
        updatedAt: new Date(request.updatedAt),
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

  const markDeletedBookQuery = db
    .updateTable("book")
    .set("deletedAt", new Date())
    .where("id", "=", bookId)
    .where("userId", "=", userId)
    .returningAll();

  const result = await markDeletedBookQuery.executeTakeFirst();

  if (!result) {
    throw new HTTPException(404);
  }

  c.status(200);
  return c.json(result);
});

export default books;
