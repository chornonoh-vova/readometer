import { Hono } from "hono";
import type { AppEnv } from "../types";
import { zValidator } from "../lib/validator";
import z from "zod";
import { db } from "../lib/database";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";

const readingRuns = new Hono<AppEnv>();

const readingRunsSchema = z.object({
  bookId: z.uuidv7(),
});

readingRuns.get("/", zValidator("query", readingRunsSchema), async (c) => {
  const userId = c.get("user")!.id;
  const bookId = c.req.valid("query").bookId;

  const readingRunsQuery = db
    .selectFrom("readingRun")
    .selectAll()
    .where("userId", "=", userId)
    .where("bookId", "=", bookId)
    .orderBy("updatedAt", "desc");

  const result = await readingRunsQuery.execute();

  return c.json(result);
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
    })
    .returningAll();

  const result = await createReadingRunQuery.executeTakeFirst();

  if (!result) {
    throw new HTTPException(404);
  }

  c.status(201);
  return c.json(result);
});

const runIdSchema = z.object({
  runId: z.uuidv7(),
});

const updateReadingRunSchema = z.object({
  completedPages: z.number().positive().optional(),
  finishedAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime(),
});

readingRuns.put(
  "/:runId",
  zValidator("param", runIdSchema),
  zValidator("json", updateReadingRunSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const runId = c.req.valid("param").runId;

    const request = c.req.valid("json");

    const updateReadingRunQuery = db
      .updateTable("readingRun")
      .set({
        completedPages: request.completedPages,
        finishedAt: request.finishedAt
          ? new Date(request.finishedAt)
          : undefined,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", runId)
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

readingRuns.delete("/:runId", zValidator("param", runIdSchema), async (c) => {
  const userId = c.get("user")!.id;
  const runId = c.req.valid("param").runId;

  const deleteReadingRunQuery = db
    .deleteFrom("readingRun")
    .where("id", "=", runId)
    .where("userId", "=", userId);

  const result = await deleteReadingRunQuery.executeTakeFirst();

  if (!result.numDeletedRows) {
    throw new HTTPException(404);
  }

  return c.status(204);
});

export default readingRuns;
