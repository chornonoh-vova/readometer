import { format } from "date-fns";

export const DATE_FORMAT = "yyyy-MM-dd";

export function formatDate(date: Date): string;
export function formatDate(date: string): string;
export function formatDate(date: Date | string) {
  if (date instanceof Date) {
    return format(date, DATE_FORMAT);
  } else {
    return format(new Date(date), DATE_FORMAT);
  }
}

export function formatDateTime(date: string) {
  return format(new Date(date), "yyyy-MM-dd HH:mm");
}

export function formatTime(date: string) {
  return format(new Date(date), "HH:mm");
}

export function formatPartialDate(value: string): string {
  return value;
}

export function buildPartialDate(
  year: number | undefined,
  month: number | undefined,
  day: number | undefined,
): string | undefined {
  if (year === undefined) return undefined;
  const y = String(year).padStart(4, "0");
  if (month === undefined) return y;
  const m = String(month).padStart(2, "0");
  if (day === undefined) return `${y}-${m}`;
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function splitPartialDate(value: string | undefined) {
  const [year = "", month = "", day = ""] = (value ?? "").split("-");
  return { year, month, day };
}

export function formatReadingTime(readingTime: number) {
  const hours = Math.floor(readingTime / 3600);
  const minutes = Math.floor((readingTime % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(readingTime % 60)
    .toString()
    .padStart(2, "0");

  return [hours, minutes, seconds].filter(Boolean).join(":");
}
