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
  type WeekStart,
} from "@/lib/heatmap";
import { getDaysInMonth } from "date-fns";
import { memo, useMemo } from "react";
import { motion } from "motion/react";
import { itemVariants, listVariants } from "@/lib/animations";
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

const list = listVariants(0.04);

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
});

export function ReadingActivityHeatmap({
  year,
  readingActivity,
}: {
  year: number;
  readingActivity: ReadingActivity[];
}) {
  const displayBy = useReadingActivityStore((state) => state.displayBy);
  const weekStart = useReadingActivityStore((state) => state.weekStart);

  const activity = useMemo(
    () => getActivityMap(readingActivity, bgClass.length),
    [readingActivity],
  );

  return (
    <div className="w-full grid grid-cols-1 gap-4 p-2">
      <motion.section
        className="flex flex-wrap items-center justify-center gap-2.5"
        variants={list}
        initial="hidden"
        animate="show"
      >
        {Array.from({ length: 12 }, (_, month) => (
          <motion.div key={month} variants={itemVariants}>
            <Month
              year={year}
              month={month}
              activity={activity}
              display={displayBy}
              weekStart={weekStart}
            />
          </motion.div>
        ))}
      </motion.section>
    </div>
  );
}
