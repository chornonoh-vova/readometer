import { getWeekOfMonth } from "date-fns";
import { getBucket } from "./bucket";
import { formatDate } from "./format";
import type { ReadingActivity } from "./reading-activity";

export type WeekStart = "monday" | "sunday";

export type ActivityEntry = {
  totalReadPages: number;
  totalReadTime: number;
  pagesBucket: number;
  timeBucket: number;
};

export type ActivityMap = Map<string, ActivityEntry>;

export function getActivityMap(
  readingActivity: ReadingActivity[],
  bucketCount: number,
): ActivityMap {
  const map: ActivityMap = new Map();
  let maxTime = 0;
  let maxPages = 0;

  for (const { date, totalReadPages, totalReadTime } of readingActivity) {
    const readPages = Number(totalReadPages);
    const readTime = Number(totalReadTime);
    map.set(formatDate(date), {
      totalReadPages: readPages,
      totalReadTime: readTime,
      pagesBucket: 0,
      timeBucket: 0,
    });
    maxPages = Math.max(maxPages, readPages);
    maxTime = Math.max(maxTime, readTime);
  }

  for (const value of map.values()) {
    value.timeBucket = getBucket(value.totalReadTime, maxTime, bucketCount);
    value.pagesBucket = getBucket(value.totalReadPages, maxPages, bucketCount);
  }
  return map;
}

export function getCalendarPosition(date: Date, weekStart: WeekStart) {
  const day = date.getDay();
  const col = weekStart === "monday" ? ((day + 6) % 7) + 1 : day + 1;
  const row = getWeekOfMonth(date, {
    weekStartsOn: weekStart === "monday" ? 1 : 0,
  });

  return { col, row };
}
