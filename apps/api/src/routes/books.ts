import { Hono } from "hono";
import requireAuth from "../middlewares/requireAuth.ts";
import type { AppEnv } from "../types.ts";
import { db } from "../lib/database.ts";
import { zValidator } from "../lib/validator.ts";
import { HTTPException } from "hono/http-exception";
import z from "zod";
import { isbnSchema, normalizeIsbnToIsbn13 } from "../lib/isbn.ts";

const books = new Hono<AppEnv>();

books.use(requireAuth);

books.get("/", async (c) => {
  const userId = c.get("user")!.id;
  const query = (c.req.query("q") ?? "").trim();

  let booksQuery = db
    .selectFrom("book")
    .selectAll()
    .where("userId", "=", userId)
    .orderBy("updatedAt", "desc");

  if (query) {
    booksQuery = booksQuery.where((eb) =>
      eb.or([
        eb("title", "ilike", `%${query}%`),
        eb("author", "ilike", `%${query}%`),
      ]),
    );
  }

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

export default books;
