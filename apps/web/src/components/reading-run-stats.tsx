import { useReadingSessionsSuspenseQuery } from "@/lib/reading-sessions";
import { ReadingTime } from "./reading-time";
import { computeRunStats } from "@/lib/run-stats";
import { useMemo, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function plural(count: number, noun: string) {
  return count === 1 ? noun : `${noun}s`;
}

function ReadingRunStat({
  icon,
  className,
  children,
  ...props
}: ComponentProps<"li"> & { icon: string }) {
  return (
    <li
      className={cn(
        "inline-flex flex-col items-center rounded-md px-1 py-2 border",
        className,
      )}
      {...props}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-center">{children}</span>
    </li>
  );
}

export function ReadingRunStats({ runId }: { runId: string }) {
  const { data: readingSessions } = useReadingSessionsSuspenseQuery(runId);

  const {
    totalReadTime,
    pagesPerHour,
    averageLength,
    readingDays,
    longestStreak,
  } = useMemo(() => computeRunStats(readingSessions), [readingSessions]);

  if (readingSessions.length === 0) {
    return null;
  }

  return (
    <>
      <h3 className="text-sm font-semibold">Stats</h3>
      <ul className="grid grid-rows-2 grid-cols-3 gap-1.5">
        <ReadingRunStat
          icon="📖"
          className="bg-red-100/50 border-red-200 dark:bg-red-900/50 dark:border-red-800"
        >
          {pagesPerHour} {plural(pagesPerHour, "page")} per hour
        </ReadingRunStat>
        <ReadingRunStat
          icon="⏱️"
          className="bg-amber-100/50 border-amber-200 dark:bg-amber-900/50 dark:border-amber-800"
        >
          reading for <ReadingTime value={totalReadTime} />
        </ReadingRunStat>
        <ReadingRunStat
          icon="📅"
          className="bg-lime-100/50 border-lime-200 dark:bg-lime-900/50 dark:border-lime-800"
        >
          reading for {readingDays} {plural(readingDays, "day")}
        </ReadingRunStat>
        <ReadingRunStat
          icon="🔥"
          className="bg-emerald-100/50 border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-800"
        >
          {longestStreak} {plural(longestStreak, "day")} longest streak
        </ReadingRunStat>
        <ReadingRunStat
          icon="📚"
          className="bg-cyan-100/50 border-cyan-200 dark:bg-cyan-900/50 dark:border-cyan-800"
        >
          {readingSessions.length} reading{" "}
          {plural(readingSessions.length, "session")}
        </ReadingRunStat>
        <ReadingRunStat
          icon="📏"
          className="bg-fuchsia-100/50 border-fuchsia-200 dark:bg-fuchsia-900/50 dark:border-fuchsia-800"
        >
          <ReadingTime value={averageLength} /> average session
        </ReadingRunStat>
      </ul>
    </>
  );
}
