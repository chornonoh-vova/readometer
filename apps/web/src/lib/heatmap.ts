import { getWeekOfMonth, startOfMonth, subMonths } from "date-fns";
import { getBucket } from "./bucket";
import { formatDate } from "./format";
import type { ReadingActivity } from "./reading-activity";

export type WeekStart = "monday" | "sunday";

export type HeatmapMonth = { year: number; month: number };

/** The year Readometer launched; no user has reading history before it. */
export const minYear = 2026;

export const monthsPerView = 12;

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

export function getActivityYears(now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const count = Math.max(0, currentYear - minYear + 1);
  return Array.from({ length: count }, (_, i) => currentYear - i);
}

export function getRollingMonths(
  count: number,
  now = new Date(),
): HeatmapMonth[] {
  const current = startOfMonth(now);
  return Array.from({ length: count }, (_, i) => {
    const date = subMonths(current, i);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
}

export function getYearMonths(year: number): HeatmapMonth[] {
  return Array.from({ length: monthsPerView }, (_, i) => ({
    year,
    month: monthsPerView - 1 - i,
  }));
}

export function getActivityMonths(
  year: number | undefined,
  now = new Date(),
): HeatmapMonth[] {
  return year === undefined
    ? getRollingMonths(monthsPerView, now)
    : getYearMonths(year);
}

/** Half-open `[from, to)`, as the `yyyy-MM-dd` strings the API expects. */
export function getMonthsRange(months: HeatmapMonth[]): {
  from: string;
  to: string;
} {
  const newest = months.at(0);
  const oldest = months.at(-1);

  if (!newest || !oldest) {
    throw new Error("getMonthsRange needs at least one month");
  }

  return {
    from: formatDate(new Date(oldest.year, oldest.month, 1)),
    to: formatDate(new Date(newest.year, newest.month + 1, 1)),
  };
}
