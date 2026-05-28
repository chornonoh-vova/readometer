import { formatDate } from "@/lib/format";

export function ReadingDate({ value }: { value: string }) {
  return <time dateTime={value}>{formatDate(value)}</time>;
}
