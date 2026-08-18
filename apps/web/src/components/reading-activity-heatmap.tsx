import type { ReadingActivity } from "@/lib/reading-activity";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatReadingDuration,
  formatReadingTime,
} from "@/lib/format";
import {
  getActivityMap,
  getCalendarPosition,
  type ActivityMap,
  type HeatmapMonth,
  type WeekStart,
} from "@/lib/heatmap";
import { getDaysInMonth } from "date-fns";
import { memo, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTrigger,
} from "./ui/popover";
import {
  useReadingActivityStore,
  type DisplayBy,
} from "@/store/reading-activity";

// Exported so the route's loading skeleton renders the same shape.
export const monthGridClass =
  "grid grid-rows-[repeat(6,18px)] grid-cols-[repeat(7,18px)] gap-0.75";
export const monthColumnClass = "flex flex-col items-center gap-0.75";
export const monthsSectionClass =
  "flex flex-wrap items-center justify-center gap-2";

// Hoisted: an inline options object bypasses the runtime's format cache.
const monthLongFormat = new Intl.DateTimeFormat(undefined, { month: "long" });
const monthShortYearFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

const bgClass = [
  "bg-activity-default-0",
  "bg-activity-default-1",
  "bg-activity-default-2",
  "bg-activity-default-3",
  "bg-activity-default-4",
];

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
  const rawTime = entry.totalReadTime;
  const duration = formatReadingDuration(rawTime);
  const time = formatReadingTime(rawTime);

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
          <li>
            Read time: <time dateTime={duration}>{time}</time>
          </li>
          <li>Pages read: {pages}</li>
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

const Month = memo(function Month({
  year,
  month,
  showYear,
  activity,
  display,
  weekStart,
}: {
  year: number;
  month: number;
  showYear: boolean;
  activity: ActivityMap;
  display: DisplayBy;
  weekStart: WeekStart;
}) {
  const firstDate = new Date(year, month, 1);
  const days = getDaysInMonth(firstDate);
  return (
    <div className={monthColumnClass}>
      <p className="text-sm" data-slot="month-label">
        {(showYear ? monthShortYearFormat : monthLongFormat).format(firstDate)}
      </p>
      <div className={monthGridClass}>
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
});

export function ReadingActivityHeatmap({
  months,
  readingActivity,
}: {
  months: HeatmapMonth[];
  readingActivity: ReadingActivity[];
}) {
  const displayBy = useReadingActivityStore((state) => state.displayBy);
  const weekStart = useReadingActivityStore((state) => state.weekStart);

  const activity = useMemo(
    () => getActivityMap(readingActivity, bgClass.length),
    [readingActivity],
  );

  // Month names alone are ambiguous across a year boundary.
  const showYear = months[0]?.year !== months.at(-1)?.year;

  return (
    <div className="w-full grid grid-cols-1 gap-4 p-2">
      <section className={monthsSectionClass}>
        {months.map(({ year, month }) => (
          <Month
            key={`${year}-${month}`}
            year={year}
            month={month}
            showYear={showYear}
            activity={activity}
            display={displayBy}
            weekStart={weekStart}
          />
        ))}
      </section>
    </div>
  );
}
