import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return format(new Date(date), "yyyy-MM-dd");
}

export function formatDateTime(date: string) {
  return format(new Date(date), "yyyy-MM-dd HH:mm");
}

export function formatReadingTime(readingTime: number) {
  const hours = Math.floor(readingTime / (60 * 60));
  const minutes = Math.floor(readingTime / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(readingTime % 60)
    .toString()
    .padStart(2, "0");

  return `${hours ? hours + ":" : ""}${minutes}:${seconds}`;
}
