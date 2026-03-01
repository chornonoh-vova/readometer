import { Hono } from "hono";
import type { AppEnv } from "../types";
import { zValidator } from "../lib/validator";
import z from "zod";
import { db } from "../lib/database";

const readingActivity = new Hono<AppEnv>();

const readingActivitySchema = z.object({
  year: z.preprocess(Number, z.number().int().positive()),
});

readingActivity.get(
  "/",
  zValidator("query", readingActivitySchema),
  async (c) => {
    const userId = c.get("user")!.id;
    const year = c.req.valid("query").year;

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const result = await db
      .selectFrom("readingSession")
      .select(({ fn }) => [
        fn.sum<number>("readPages").as("totalReadPages"),
        fn.sum<number>("readTime").as("totalReadTime"),
        fn<Date>("date", ["startTime"]).as("date"),
      ])
      .where("userId", "=", userId)
      .where("startTime", ">=", start)
      .where("startTime", "<", end)
      .groupBy("date")
      .execute();

    return c.json(result);
  },
);

export default readingActivity;
