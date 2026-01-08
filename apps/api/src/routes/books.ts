import { Hono } from "hono";
import requireAuth from "../middlewares/requireAuth.ts";
import type { AppEnv } from "../types.ts";
import { db } from "../lib/database.ts";
import { zValidator } from "../lib/validator.ts";
import { HTTPException } from "hono/http-exception";
import z from "zod";

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
  const bookId = c.req.param("bookId");

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

export default books;
