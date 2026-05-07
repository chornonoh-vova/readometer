import { queryOptions } from "@tanstack/react-query";
import { readingActivity } from "./query-keys";
import { fetchApi } from "./api";

export type ReadingActivity = {
  date: string;
  totalReadPages: string;
  totalReadTime: string;
};

async function fetchReadingActivity(
  year: number,
  tz: string,
): Promise<ReadingActivity[]> {
  const searchParams = new URLSearchParams({ year: year.toString(), tz });
  return await fetchApi(`/reading-activity?${searchParams}`);
}

export function readingActivityQueryOptions(year: number) {
  const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return queryOptions({
    queryKey: readingActivity.byYear(year, tz),
    queryFn: () => fetchReadingActivity(year, tz),
  });
}
