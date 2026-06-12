import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sumBy<T>(items: T[], fn: (item: T) => number) {
  return items.reduce((acc, item) => acc + fn(item), 0);
}
