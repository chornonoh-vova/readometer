import { queryOptions } from "@tanstack/react-query";
import { readingActivity } from "./query-keys";
import { fetchApi } from "./api";

export type ReadingActivity = {
  date: string;
  totalReadPages: string;
  totalReadTime: string;
};

async function fetchReadingActivity(year: number): Promise<ReadingActivity[]> {
  const searchParams = new URLSearchParams({ year: year.toString() });
  return await fetchApi(`/reading-activity?${searchParams}`);
}

export function readingActivityQueryOptions(year: number) {
  return queryOptions({
    queryKey: readingActivity.byYear(year),
    queryFn: () => fetchReadingActivity(year),
  });
}
