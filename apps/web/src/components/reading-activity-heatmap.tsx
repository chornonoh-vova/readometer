import type { ReadingActivity } from "@/lib/reading-activity";
import { cn, formatDate, formatReadingTime, getBucket } from "@/lib/utils";
import { getDaysInMonth, getWeekOfMonth } from "date-fns";
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTrigger,
} from "./ui/popover";
import { useLocalStorage } from "@/hooks/use-local-storage";

type ActivityMap = Map<
  string,
  {
    totalReadPages: number;
    totalReadTime: number;
    pagesBucket: number;
    timeBucket: number;
  }
>;

type DisplayBy = "time" | "pages";

type WeekStart = "monday" | "sunday";

const bgClass = [
  "bg-activity-default-0",
  "bg-activity-default-1",
  "bg-activity-default-2",
  "bg-activity-default-3",
  "bg-activity-default-4",
];

function getActivityMap(readingActivity: ReadingActivity[]): ActivityMap {
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
    value.timeBucket = getBucket(value.totalReadTime, maxTime, bgClass.length);
    value.pagesBucket = getBucket(
      value.totalReadPages,
      maxPages,
      bgClass.length,
    );
  }
  return map;
}

function getCalendarPosition(date: Date, weekStart: WeekStart) {
  const day = date.getDay();
  const dayOfWeek = weekStart === "monday" ? ((day + 6) % 7) + 1 : day + 1;
  const week = getWeekOfMonth(date, {
    weekStartsOn: weekStart === "monday" ? 1 : 0,
  });

  return { col: dayOfWeek, row: week };
}

function Day({
  id,
  date,
  activity,
  display,
  weekStart,
}: {
  id: string;
  date: Date;
  activity: ActivityMap;
  display: DisplayBy;
  weekStart: WeekStart;
}) {
  const { row, col } = getCalendarPosition(date, weekStart);

  const commonClasses = "text-center rounded-sm";
  const style = {
    gridColumn: col,
    gridRow: row,
  };

  const entry = activity.get(id);

  if (!entry) {
    return (
      <div className={cn(commonClasses, bgClass[0])} style={style}>
        <span className="sr-only">No reading activity for {id}</span>
      </div>
    );
  }

  const bucket = display === "time" ? entry.timeBucket : entry.pagesBucket;
  const pages = entry.totalReadPages;
  const time = formatReadingTime(entry.totalReadTime);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(commonClasses, bgClass[bucket])}
        style={style}
        aria-label={`Reading activity for ${id}. ${pages} pages, ${time}`}
        openOnHover
      />
      <PopoverContent>
        <PopoverHeader>Reading activity at {id}</PopoverHeader>
        <PopoverDescription render={<ul />}>
          <li>Read time: {time}</li>
          <li>Pages read: {pages}</li>
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

function Month({
  year,
  month,
  activity,
  display,
  weekStart,
}: {
  year: number;
  month: number;
  activity: ActivityMap;
  display: DisplayBy;
  weekStart: WeekStart;
}) {
  const firstDate = new Date(year, month, 1);
  const days = getDaysInMonth(firstDate);
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm">
        {firstDate.toLocaleString("default", { month: "long" })}
      </p>
      <div className="grid grid-rows-[repeat(6,20px)] grid-cols-[repeat(7,20px)] gap-1">
        {Array.from({ length: days }, (_, day) => {
          const date = new Date(year, month, day + 1);
          const dateKey = formatDate(date);

          return (
            <Day
              key={dateKey}
              id={dateKey}
              date={date}
              activity={activity}
              display={display}
              weekStart={weekStart}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ReadingActivityHeatmap({
  year,
  readingActivity,
}: {
  year: number;
  readingActivity: ReadingActivity[];
}) {
  const [displayBy] = useLocalStorage<DisplayBy>(
    "reading-activity-display",
    "time",
  );
  const [weekStart] = useLocalStorage<WeekStart>(
    "reading-activity-week-start",
    "monday",
  );

  const activity = useMemo(
    () => getActivityMap(readingActivity),
    [readingActivity],
  );

  return (
    <div className="w-full grid grid-cols-1 gap-4 p-2">
      <section className="flex flex-wrap items-center justify-center gap-2.5">
        {Array.from({ length: 12 }, (_, month) => (
          <Month
            key={month}
            year={year}
            month={month}
            activity={activity}
            display={displayBy}
            weekStart={weekStart}
          />
        ))}
      </section>
    </div>
  );
}
