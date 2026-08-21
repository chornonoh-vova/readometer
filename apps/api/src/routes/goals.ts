import { Hono } from "hono";
import type { AppEnv } from "../types";
import z from "zod";
import { zValidator } from "../lib/validator";
import { db } from "../lib/database";
import { FIELD_LIMITS } from "../lib/limits.ts";
import { sql } from "kysely";
import { HTTPException } from "hono/http-exception";
import { canonicalizeTz, dayEndInTz, dayStartInTz } from "../lib/tz";

const goals = new Hono<AppEnv>();

// Split by metric, not just by type: a daily minutes ceiling (a day has 1440)
// is not the same shape of number as a daily pages ceiling.
const upsertGoalSchema = z.union([
  z.object({
    id: z.uuidv7(),
    type: z.literal("daily"),
    metric: z.literal("minutes"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalDailyMinutes),
  }),
  z.object({
    id: z.uuidv7(),
    type: z.literal("daily"),
    metric: z.literal("pages"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalDailyPages),
  }),
  z.object({
    id: z.uuidv7(),
    type: z.literal("yearly"),
    metric: z.literal("books"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalYearlyBooks),
  }),
]);

goals.post("/", zValidator("json", upsertGoalSchema), async (c) => {
  const userId = c.get("user")!.id;
  const request = c.req.valid("json");

  const result = await db
    .insertInto("goal")
    .values({
      id: request.id,
      userId,
      type: request.type,
      metric: request.metric,
      target: request.target,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflict((oc) =>
      oc.columns(["userId", "type"]).doUpdateSet({
        metric: request.metric,
        target: request.target,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();

  return c.json(
    result,
    result.createdAt.getTime() === result.updatedAt.getTime() ? 201 : 200,
  );
});

goals.get("/", async (c) => {
  const userId = c.get("user")!.id;

  const result = await db
    .selectFrom("goal")
    .selectAll()
    .where("userId", "=", userId)
    .execute();

  return c.json(result);
});

const progressSchema = z.object({
  date: z.iso.date(),
  tz: z.string().max(FIELD_LIMITS.tz),
});

async function dailyActual(
  userId: string,
  metric: string,
  date: string,
  tz: string,
): Promise<number> {
  const dayStart = dayStartInTz(date, tz);
  const dayEnd = dayEndInTz(date, tz);

  const column = metric === "minutes" ? "readTime" : "readPages";

  const row = await db
    .selectFrom("readingSession")
    .select(({ fn }) => [fn.sum<number>(column).as("total")])
    .where("userId", "=", userId)
    .where("startTime", ">=", dayStart)
    .where("startTime", "<", dayEnd)
    .executeTakeFirst();

  const total = Number(row?.total ?? 0);
  return metric === "minutes" ? Math.floor(total / 60) : total;
}

async function yearlyBooksActual(
  userId: string,
  date: string,
  tz: string,
): Promise<number> {
  const year = Number(date.slice(0, 4));
  const yearStart = dayStartInTz(`${year}-01-01`, tz);
  const yearEnd = dayStartInTz(`${year + 1}-01-01`, tz);

  const row = await db
    .selectFrom("readingRun")
    .select(({ fn }) => [fn.countAll<number>().as("total")])
    .innerJoin("book", "book.id", "readingRun.bookId")
    .where("book.userId", "=", userId)
    .whereRef("readingRun.completedPages", ">=", "book.totalPages")
    .where("readingRun.abandoned", "=", false)
    .where("readingRun.finishedAt", ">=", yearStart)
    .where("readingRun.finishedAt", "<", yearEnd)
    .executeTakeFirst();

  return Number(row?.total ?? 0);
}

goals.get("/progress", zValidator("query", progressSchema), async (c) => {
  const userId = c.get("user")!.id;
  const { date, tz } = c.req.valid("query");
  const canonicTZ = canonicalizeTz(tz);

  const userGoals = await db
    .selectFrom("goal")
    .select(["type", "metric", "target"])
    .where("userId", "=", userId)
    .execute();

  const dailyGoal = userGoals.find((g) => g.type === "daily");
  const yearlyGoal = userGoals.find((g) => g.type === "yearly");

  const [dailyActualValue, yearlyActualValue] = await Promise.all([
    dailyGoal ? dailyActual(userId, dailyGoal.metric, date, canonicTZ) : null,
    yearlyGoal ? yearlyBooksActual(userId, date, canonicTZ) : null,
  ]);

  const daily = dailyGoal
    ? { goal: dailyGoal, actual: dailyActualValue }
    : null;
  const yearly = yearlyGoal
    ? { goal: yearlyGoal, actual: yearlyActualValue }
    : null;

  return c.json({ daily, yearly });
});

const goalIdSchema = z.object({
  goalId: z.uuidv7(),
});

goals.delete("/:goalId", zValidator("param", goalIdSchema), async (c) => {
  const userId = c.get("user")!.id;
  const goalId = c.req.valid("param").goalId;

  const result = await db
    .deleteFrom("goal")
    .where("id", "=", goalId)
    .where("userId", "=", userId)
    .executeTakeFirst();

  if (!result.numDeletedRows) {
    throw new HTTPException(404, { message: "Not found" });
  }

  return c.body(null, 204);
});

export default goals;
