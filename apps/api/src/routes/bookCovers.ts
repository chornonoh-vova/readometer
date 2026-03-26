import { Hono } from "hono";
import { mkdir, unlink } from "node:fs/promises";
import type { AppEnv } from "../types";
import z from "zod";
import { zValidator } from "../lib/validator";
import { db } from "../lib/database";
import { HTTPException } from "hono/http-exception";
import sharp from "sharp";

const bookCover = new Hono<AppEnv>();

const bookSchema = z.object({
  bookId: z.uuidv7(),
});

const basePath = process.env.STORAGE_PATH;

bookCover.post("/:bookId/cover", zValidator("param", bookSchema), async (c) => {
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

  await mkdir(`${basePath}/covers`, { recursive: true });

  if (found.coverId) {
    await unlink(`${basePath}/covers/${found.coverId}-sm.webp`);
    await unlink(`${basePath}/covers/${found.coverId}-md.webp`);
  }

  const coverId = crypto.randomUUID();
  const body = await c.req.parseBody();

  const file = body["cover"];

  if (file instanceof File) {
    const image = sharp(await file.arrayBuffer());
    const stats = await image.stats();
    const color = stats.dominant;

    const coverColor =
      "#" +
      [color.r, color.g, color.b]
        .map((p) => p.toString(16).padStart(2, "0"))
        .join("");

    await image
      .resize({ width: 200, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(`${basePath}/covers/${coverId}-sm.webp`);

    await image
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(`${basePath}/covers/${coverId}-md.webp`);

    await db
      .updateTable("book")
      .set({ coverId, coverColor })
      .where("id", "=", bookId)
      .where("userId", "=", userId)
      .execute();

    return c.json({ coverId, coverColor }, 201);
  }

  return c.json({ error: "No file uploaded or invalid format" }, 400);
});

export default bookCover;
