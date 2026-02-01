import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { fetchApi } from "./api";
import { books, readingRuns } from "./query-keys";

export type ReadingRun = {
  id: string;
  userId: string;
  bookId: string;
  completedPages: number;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export type NewReadingRun = {
  id: string;
  bookId: string;
  completedPages: number;
  startedAt: string;
};

async function fetchReadingRuns(bookId: string): Promise<ReadingRun[]> {
  const searchParams = new URLSearchParams({ bookId });
  return fetchApi(`/reading-runs?${searchParams}`);
}

export function readingRunsQueryOptions(bookId: string) {
  return queryOptions({
    queryKey: readingRuns.byBook(bookId),
    queryFn: () => fetchReadingRuns(bookId),
  });
}

export function useReadingRunsSuspenseQuery(bookId: string) {
  return useSuspenseQuery(readingRunsQueryOptions(bookId));
}

async function addReadingRun(
  newReadingRun: NewReadingRun,
): Promise<ReadingRun> {
  return await fetchApi("/reading-runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newReadingRun),
  });
}

export function useAddReadingRunMutation() {
  return useMutation({
    mutationFn: (newReadingRun: NewReadingRun) => addReadingRun(newReadingRun),
    onSuccess: (_data, variables, _onMutateResult, context) => {
      const { bookId } = variables;
      context.client.invalidateQueries({
        queryKey: books.list,
      });
      context.client.invalidateQueries({
        queryKey: books.details(bookId),
      });
      context.client.invalidateQueries({
        queryKey: readingRuns.byBook(bookId),
      });
    },
  });
}
