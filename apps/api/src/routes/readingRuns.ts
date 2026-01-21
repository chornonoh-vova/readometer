import { Hono } from "hono";
import type { AppEnv } from "../types";
import { zValidator } from "../lib/validator";
import z from "zod";
import { db } from "../lib/database";
import { HTTPException } from "hono/http-exception";

const readingRuns = new Hono<AppEnv>();

const readingRunIdSchema = z.object({
  readingRunId: z.uuidv7(),
});

const createReadingRunSchema = z.object({
  id: z.uuidv7(),
  bookId: z.uuidv7(),
  completedPages: z.number().positive(),
  startedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

readingRuns.post("/", zValidator("json", createReadingRunSchema), async (c) => {
  const userId = c.get("user")!.id;
  const request = c.req.valid("json");

  const createReadingRunQuery = db
    .insertInto("readingRun")
    .values({
      id: request.id,
      userId,
      bookId: request.bookId,
      completedPages: request.completedPages,
      startedAt: new Date(request.startedAt),
      updatedAt: new Date(request.updatedAt),
    })
    .returningAll();

  const result = await createReadingRunQuery.executeTakeFirst();

  if (!result) {
    throw new HTTPException(404);
  }

  c.status(201);
  return c.json(result);
});

const updateReadingRunSchema = z.object({
  completedPages: z.number().positive().optional(),
  finishedAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime(),
});

readingRuns.put(
  "/:readingRunId",
  zValidator("param", readingRunIdSchema),
  zValidator("json", updateReadingRunSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const readingRunId = c.req.valid("param").readingRunId;

    const request = c.req.valid("json");

    const updateReadingRunQuery = db
      .updateTable("readingRun")
      .set({
        completedPages: request.completedPages,
        finishedAt: request.finishedAt
          ? new Date(request.finishedAt)
          : undefined,
        updatedAt: new Date(request.updatedAt),
      })
      .where("id", "=", readingRunId)
      .where("userId", "=", userId)
      .returningAll();

    const result = await updateReadingRunQuery.executeTakeFirst();

    if (!result) {
      throw new HTTPException(404);
    }

    c.status(200);
    return c.json(result);
  },
);

export default readingRuns;
