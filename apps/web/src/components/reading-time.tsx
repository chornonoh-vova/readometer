import { formatReadingDuration, formatReadingTime } from "@/lib/format";

export function ReadingTime({ value }: { value: number }) {
  const time = formatReadingTime(value);
  const duration = formatReadingDuration(value);
  return <time dateTime={duration}>{time}</time>;
}
