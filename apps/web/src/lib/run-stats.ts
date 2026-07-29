import { differenceInCalendarDays } from "date-fns";
import { formatDate } from "./format";
import type { ReadingSession } from "./reading-sessions";
import { sumBy } from "./utils";

export type RunStats = {
  totalReadTime: number;
  pagesPerHour: number;
  averageLength: number;
  readingDays: number;
  longestStreak: number;
};

export function computeRunStats(readingSessions: ReadingSession[]): RunStats {
  if (readingSessions.length === 0) {
    return {
      totalReadTime: 0,
      pagesPerHour: 0,
      averageLength: 0,
      readingDays: 0,
      longestStreak: 0,
    };
  }

  const uniqueDays = Array.from(
    new Set(readingSessions.map((s) => formatDate(s.startTime))),
  ).toSorted();

  const totalReadTime = sumBy(readingSessions, (s) => s.readTime);
  const totalReadPages = sumBy(readingSessions, (s) => s.readPages);

  const pagesPerHour = Math.round(totalReadPages / (totalReadTime / 60 / 60));

  const averageLength = totalReadTime / readingSessions.length;

  let longestStreak = 0;
  let currentStreak = 0;

  let previousDate: Date | undefined;

  for (const day of uniqueDays) {
    const date = new Date(day);
    const isConsecutive =
      previousDate !== undefined &&
      differenceInCalendarDays(date, previousDate) === 1;
    currentStreak = isConsecutive ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDate = date;
  }

  return {
    totalReadTime,
    pagesPerHour,
    averageLength,
    readingDays: uniqueDays.length,
    longestStreak,
  };
}
