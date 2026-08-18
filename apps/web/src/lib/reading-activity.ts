import { queryOptions } from "@tanstack/react-query";
import { readingActivity } from "./query-keys";
import { fetchApi } from "./api";

export type ReadingActivity = {
  date: string;
  totalReadPages: string;
  totalReadTime: string;
};

async function fetchReadingActivity(
  from: string,
  to: string,
  tz: string,
): Promise<ReadingActivity[]> {
  const searchParams = new URLSearchParams({ from, to, tz });
  return await fetchApi(`/reading-activity?${searchParams}`);
}

/** `from` is inclusive, `to` is exclusive; both are `yyyy-MM-dd`. */
export function readingActivityQueryOptions(from: string, to: string) {
  const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return queryOptions({
    queryKey: readingActivity.byRange(from, to, tz),
    queryFn: () => fetchReadingActivity(from, to, tz),
  });
}
