import { Hono } from "hono";
import type { AppEnv } from "../types";
import { zValidator } from "../lib/validator";
import z from "zod";
import { db } from "../lib/database";
import { sql } from "kysely";
import { canonicalizeTz, dayStartInTz } from "../lib/tz";

const readingActivity = new Hono<AppEnv>();

const MS_PER_DAY = 86_400_000;
// No view exceeds 12 months; a leap year plus tz slack covers every caller.
const MAX_RANGE_DAYS = 400;

const readingActivitySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    tz: z.string(),
  })
  .refine(({ from, to }) => from < to, {
    message: "must be before `to`",
    path: ["from"],
  })
  .refine(
    ({ from, to }) =>
      (Date.parse(to) - Date.parse(from)) / MS_PER_DAY <= MAX_RANGE_DAYS,
    {
      message: `range must not span more than ${MAX_RANGE_DAYS} days`,
      path: ["to"],
    },
  );

readingActivity.get(
  "/",
  zValidator("query", readingActivitySchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const { from, to, tz } = c.req.valid("query");
    const canonicTZ = canonicalizeTz(tz);

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
      .where("startTime", ">=", dayStartInTz(from, canonicTZ))
      .where("startTime", "<", dayStartInTz(to, canonicTZ))
      .groupBy("date")
      .execute();

    return c.json(result);
  },
);

export default readingActivity;
