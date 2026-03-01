import type { ReadingActivity } from "@/lib/reading-activity";
import { cn, formatReadingTime, getBucket } from "@/lib/utils";
import { format, getDaysInMonth, getWeekOfMonth } from "date-fns";
import { useState } from "react";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Field, FieldContent, FieldLabel } from "./ui/field";
import { useNavigate } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTrigger,
} from "./ui/popover";

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

const bgClass = [
  "bg-activity-default-0",
  "bg-activity-default-1",
  "bg-activity-default-2",
  "bg-activity-default-3",
  "bg-activity-default-4",
];

const minYear = 2026;

function MonthHeatmap({
  year,
  month,
  activity,
  display,
}: {
  year: number;
  month: number;
  activity: ActivityMap;
  display: DisplayBy;
}) {
  const firstDate = new Date(year, month, 1);
  const days = getDaysInMonth(firstDate);
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm">
        {firstDate.toLocaleString("default", { month: "long" })}
      </p>
      <div className="grid grid-rows-[repeat(6,22px)] grid-cols-[repeat(7,22px)] gap-1">
        {Array.from({ length: days }, (_, i) => i).map((day) => {
          const date = new Date(year, month, day + 1);
          const dateKey = format(date, "yyyy-MM-dd");
          const dayOfWeek = date.getDay() + 1;
          const week = getWeekOfMonth(date);

          let bucket = 0;

          const entry = activity.get(dateKey);

          if (entry) {
            bucket = display === "time" ? entry.timeBucket : entry.pagesBucket;
          }

          return (
            <Popover key={dateKey}>
              <PopoverTrigger
                className={cn("text-center rounded-sm", bgClass[bucket])}
                style={{
                  gridColumn: dayOfWeek,
                  gridRow: week,
                }}
                aria-label={`Reading activity for ${dateKey}`}
                openOnHover
              />
              <PopoverContent>
                <PopoverHeader>Reading activity at {dateKey}</PopoverHeader>
                <PopoverDescription>
                  <p>
                    Read time: {formatReadingTime(entry?.totalReadTime ?? 0)}
                  </p>
                  <p>Pages read: {entry?.totalReadPages ?? 0}</p>
                </PopoverDescription>
              </PopoverContent>
            </Popover>
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
  const navigate = useNavigate();
  const [displayBy, setDisplayBy] = useState<DisplayBy>("time");

  const activity: ActivityMap = new Map();
  let maxTime = 0;
  let maxPages = 0;

  for (const { date, totalReadPages, totalReadTime } of readingActivity) {
    const readPages = Number(totalReadPages);
    const readTime = Number(totalReadTime);
    activity.set(format(date, "yyyy-MM-dd"), {
      totalReadPages: readPages,
      totalReadTime: readTime,
      pagesBucket: 0,
      timeBucket: 0,
    });
    maxPages = Math.max(maxPages, readPages);
    maxTime = Math.max(maxTime, readTime);
  }

  const maxTimeNormalized = Math.log2(maxTime + 1);
  const maxPagesNormalized = Math.log2(maxPages + 1);

  for (const value of activity.values()) {
    value.timeBucket = getBucket(
      Math.log2(value.totalReadTime + 1),
      maxTimeNormalized,
      bgClass.length,
    );
    value.pagesBucket = getBucket(
      Math.log2(value.totalReadPages + 1),
      maxPagesNormalized,
      bgClass.length,
    );
  }

  const maxYear = new Date().getFullYear() + 1;

  return (
    <div className="w-full grid grid-cols-1 gap-4 p-2">
      <div className="grid grid-cols-2 gap-2.5">
        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="display">Display</FieldLabel>
          </FieldContent>
          <NativeSelect
            id="display"
            value={displayBy}
            onChange={(e) => setDisplayBy(e.target.value as DisplayBy)}
          >
            <NativeSelectOption value="time">
              By reading time
            </NativeSelectOption>
            <NativeSelectOption value="pages">By pages read</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="year">Year</FieldLabel>
          </FieldContent>
          <NativeSelect
            id="year"
            value={year}
            onChange={(e) =>
              navigate({
                to: "/activity",
                search: { year: Number(e.target.value) },
              })
            }
          >
            {Array.from({ length: maxYear - minYear }, (_, i) => i).map(
              (idx) => (
                <NativeSelectOption key={minYear + idx} value={minYear + idx}>
                  {minYear + idx}
                </NativeSelectOption>
              ),
            )}
          </NativeSelect>
        </Field>
      </div>
      <section className="flex flex-wrap items-center justify-center gap-2.5">
        {Array.from({ length: 12 }, (_, i) => i).map((month) => (
          <MonthHeatmap
            key={month}
            year={year}
            month={month}
            activity={activity}
            display={displayBy}
          />
        ))}
      </section>
    </div>
  );
}
