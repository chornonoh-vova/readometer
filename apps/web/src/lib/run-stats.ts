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

  for (let i = 0; i < uniqueDays.length; i++) {
    const isConsecutive =
      i > 0 &&
      differenceInCalendarDays(
        new Date(uniqueDays[i]),
        new Date(uniqueDays[i - 1]),
      ) === 1;
    currentStreak = isConsecutive ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return {
    totalReadTime,
    pagesPerHour,
    averageLength,
    readingDays: uniqueDays.length,
    longestStreak,
  };
}
