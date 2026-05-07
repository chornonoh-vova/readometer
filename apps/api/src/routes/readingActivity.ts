import { Hono } from "hono";
import type { AppEnv } from "../types";
import { zValidator } from "../lib/validator";
import z from "zod";
import { db } from "../lib/database";
import { sql } from "kysely";
import { canonicalizeTz } from "../lib/tz";

const readingActivity = new Hono<AppEnv>();

const readingActivitySchema = z.object({
  year: z.preprocess(Number, z.number().int().positive()),
  tz: z.string(),
});

readingActivity.get(
  "/",
  zValidator("query", readingActivitySchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const { year, tz } = c.req.valid("query");
    const canonicTZ = canonicalizeTz(tz);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    const result = await db
      .selectFrom("readingSession")
      .select(({ fn }) => [
        fn.sum<number>("readPages").as("totalReadPages"),
        fn.sum<number>("readTime").as("totalReadTime"),
        sql<string>`to_char("startTime" AT TIME ZONE ${canonicTZ}, 'YYYY-MM-DD')`.as(
          "date",
        ),
      ])
      .where("userId", "=", userId)
      .where(
        "startTime",
        ">=",
        sql<Date>`(${yearStart}::date)::timestamp AT TIME ZONE ${canonicTZ}`,
      )
      .where(
        "startTime",
        "<",
        sql<Date>`(${yearEnd}::date)::timestamp AT TIME ZONE ${canonicTZ}`,
      )
      .groupBy("date")
      .execute();

    return c.json(result);
  },
);

export default readingActivity;
