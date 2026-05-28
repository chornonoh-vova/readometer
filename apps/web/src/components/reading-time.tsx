import { formatReadingValue, formatTime } from "@/lib/format";

export function ReadingTime({ value }: { value: string | number }) {
  const [dateTime, formattedTime] =
    typeof value === "number"
      ? formatReadingValue(value)
      : [value, formatTime(value)];

  return <time dateTime={dateTime}>{formattedTime}</time>;
}
