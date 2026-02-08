import { Hono } from "hono";
import type { AppEnv } from "../types";
import z from "zod";
import { zValidator } from "../lib/validator";
import { db } from "../lib/database";
import { sql } from "kysely";
import { HTTPException } from "hono/http-exception";

const readingSessions = new Hono<AppEnv>();

const readingSessionsSchema = z.object({
  runId: z.uuidv7(),
});

readingSessions.get(
  "/",
  zValidator("query", readingSessionsSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const runId = c.req.valid("query").runId;

    const result = await db
      .selectFrom("readingSession")
      .selectAll()
      .where("userId", "=", userId)
      .where("runId", "=", runId)
      .orderBy("startTime", "desc")
      .execute();

    return c.json(result);
  },
);

const createReadingSessionSchema = z.object({
  id: z.uuidv7(),
  runId: z.uuidv7(),
  startPage: z.number().positive(),
  endPage: z.number().positive(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  readTime: z.number().positive(),
});

readingSessions.post(
  "/",
  zValidator("json", createReadingSessionSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const request = c.req.valid("json");

    try {
      const result = db.transaction().execute(async (trx) => {
        await trx
          .updateTable("readingRun")
          .set({
            completedPages: request.endPage,
          })
          .where("id", "=", request.runId)
          .returning("id")
          .executeTakeFirstOrThrow();

        return await trx
          .insertInto("readingSession")
          .values({
            id: request.id,
            userId,
            runId: request.runId,
            startPage: request.startPage,
            endPage: request.endPage,
            readPages: request.endPage - request.startPage,
            startTime: request.startTime,
            endTime: request.endTime,
            readTime: request.readTime,
          })
          .returningAll()
          .executeTakeFirst();
      });

      c.status(201);
      return c.json(result);
    } catch (error) {
      console.error(error);
      throw new HTTPException(404);
    }
  },
);

const sessionIdSchema = z.object({
  sessionId: z.uuidv7(),
});

const updateReadingSessionSchema = z.object({
  startPage: z.number().positive().optional(),
  endPage: z.number().positive().optional(),
  startTime: z.iso.datetime().optional(),
  endTime: z.iso.datetime().optional(),
  readTime: z.number().positive().optional(),
});

readingSessions.put(
  "/:sessionId",
  zValidator("param", sessionIdSchema),
  zValidator("json", updateReadingSessionSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const sessionId = c.req.valid("param").sessionId;

    const request = c.req.valid("json");

    const updateReadingSessionQuery = db
      .updateTable("readingSession")
      .set({
        startPage: request.startPage,
        endPage: request.endPage,
        readPages:
          request.startPage && request.endPage
            ? request.endPage - request.startPage
            : undefined,
        startTime: request.startTime ? new Date(request.startTime) : undefined,
        endTime: request.endTime ? new Date(request.endTime) : undefined,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", sessionId)
      .where("userId", "=", userId)
      .returningAll();

    const result = await updateReadingSessionQuery.executeTakeFirst();

    if (!result) {
      throw new HTTPException(404);
    }

    c.status(200);
    return c.json(result);
  },
);

readingSessions.delete(
  "/:sessionId",
  zValidator("param", sessionIdSchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const sessionId = c.req.valid("param").sessionId;

    const deleteReadingSessionQuery = db
      .deleteFrom("readingSession")
      .where("id", "=", sessionId)
      .where("userId", "=", userId);

    const result = await deleteReadingSessionQuery.executeTakeFirst();

    if (!result.numDeletedRows) {
      throw new HTTPException(404);
    }

    return c.body(null, 204);
  },
);

export default readingSessions;
