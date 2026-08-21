import { Hono } from "hono";
import { mkdir } from "node:fs/promises";
import type { AppEnv } from "../types";
import z from "zod";
import { zValidator } from "../lib/validator";
import { db } from "../lib/database";
import { HTTPException } from "hono/http-exception";
import { extractAverageColor, resizeToWebP } from "../lib/image";
import { removeCoverFiles } from "../lib/covers.ts";
import { BODY_LIMITS } from "../lib/limits.ts";

const bookCover = new Hono<AppEnv>();

const bookSchema = z.object({
  bookId: z.uuidv7(),
});

const basePath = process.env.STORAGE_PATH;

/**
 * `file.type` is client-supplied and trivially spoofed, so this is a cheap
 * filter rather than a guarantee - Bun.Image still rejects anything it cannot
 * decode. Note the handler decodes the same file three times
 * (extractAverageColor plus two resizeToWebP calls), which triples the cost of
 * a decompression bomb; the body limit is the only guard on decoded size,
 * because Bun.Image exposes no pre-decode dimensions.
 */
const ALLOWED_COVER_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

bookCover.post("/:bookId/cover", zValidator("param", bookSchema), async (c) => {
  const userId = c.get("user")!.id;
  const bookId = c.req.valid("param").bookId;

  const bookQuery = db
    .selectFrom("book")
    .select("coverId")
    .where("id", "=", bookId)
    .where("userId", "=", userId);

  const found = await bookQuery.executeTakeFirst();

  if (!found) {
    throw new HTTPException(404, { message: "Book not found" });
  }

  await mkdir(`${basePath}/covers`, { recursive: true });

  if (found.coverId) {
    await removeCoverFiles(found.coverId);
  }

  const coverId = crypto.randomUUID();
  const body = await c.req.parseBody();

  const file = body["cover"];

  if (!(file instanceof File)) {
    throw new HTTPException(400, {
      message: "No file uploaded or invalid format",
    });
  }

  if (!ALLOWED_COVER_TYPES.has(file.type)) {
    throw new HTTPException(400, {
      message: "Cover must be a JPEG, PNG, WebP, AVIF, or GIF image",
    });
  }

  // Backstop to the body-limit middleware: multipart overhead means the
  // envelope can pass while the part itself is larger than intended.
  if (file.size > BODY_LIMITS.upload) {
    throw new HTTPException(413, { message: "Cover image is too large" });
  }

  const [coverColor] = await Promise.all([
    extractAverageColor(file),
    resizeToWebP(file, 200, 85, `${basePath}/covers/${coverId}-sm.webp`),
    resizeToWebP(file, 400, 90, `${basePath}/covers/${coverId}-md.webp`),
  ]);

  await db
    .updateTable("book")
    .set({ coverId, coverColor })
    .where("id", "=", bookId)
    .where("userId", "=", userId)
    .execute();

  return c.json({ coverId, coverColor }, 201);
});

bookCover.delete(
  "/:bookId/cover",
  zValidator("param", bookSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const bookId = c.req.valid("param").bookId;

    const bookQuery = db
      .selectFrom("book")
      .select("coverId")
      .where("id", "=", bookId)
      .where("userId", "=", userId);

    const found = await bookQuery.executeTakeFirst();

    if (!found) {
      throw new HTTPException(404, { message: "Book not found" });
    }

    if (!found.coverId) {
      throw new HTTPException(400, { message: "Cover does not exist" });
    }

    await removeCoverFiles(found.coverId);

    await db
      .updateTable("book")
      .set({ coverId: null, coverColor: null })
      .where("id", "=", bookId)
      .where("userId", "=", userId)
      .execute();

    return c.body(null, 204);
  },
);

export default bookCover;
