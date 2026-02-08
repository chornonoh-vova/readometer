import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { fetchApi } from "./api";
import { books, readingRuns, readingSessions } from "./query-keys";

export type ReadingSession = {
  id: string;
  userId: string;
  runId: string;
  startPage: number;
  endPage: number;
  readPages: number;
  startTime: string;
  endTime: string | null;
  readTime: number;
};

export type NewReadingSession = {
  id: string;
  runId: string;
  startPage: number;
  endPage: number;
  startTime: string;
  endTime: string;
  readTime: number;
};

async function fetchReadingSessions(runId: string): Promise<ReadingSession[]> {
  const searchParams = new URLSearchParams({ runId });
  return await fetchApi(`/reading-sessions?${searchParams}`);
}

export function readingSessionsQueryOptions(runId: string) {
  return queryOptions({
    queryKey: readingSessions.byRun(runId),
    queryFn: () => fetchReadingSessions(runId),
  });
}

export function useReadingSessionsSuspenseQuery(runId: string) {
  return useSuspenseQuery(readingSessionsQueryOptions(runId));
}

async function addReadingSession(
  newReadingSession: NewReadingSession,
): Promise<ReadingSession> {
  return fetchApi("/reading-sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newReadingSession),
  });
}

export function useAddReadingSessionMutation(bookId: string) {
  return useMutation({
    mutationFn: (newReadingSession: NewReadingSession) =>
      addReadingSession(newReadingSession),
    onSuccess: (_data, variables, _onMutateResult, context) => {
      const { runId } = variables;
      context.client.invalidateQueries({
        queryKey: books.list,
      });
      context.client.invalidateQueries({
        queryKey: books.details(bookId),
      });
      context.client.invalidateQueries({
        queryKey: readingRuns.byBook(bookId),
      });
      context.client.invalidateQueries({
        queryKey: readingSessions.byRun(runId),
      });
    },
  });
}

async function deleteReadingSession(sessionId: string): Promise<void> {
  return fetchApi(`/reading-sessions/${sessionId}`, {
    method: "DELEte",
    noContent: true,
  });
}

export function useDeleteReadingSessionMutation() {
  return useMutation({
    mutationFn: ({
      sessionId,
    }: {
      sessionId: string;
      runId: string;
      bookId: string;
    }) => deleteReadingSession(sessionId),

    onSuccess: (_data, variables, _onMutateResult, context) => {
      const { runId, bookId } = variables;
      context.client.invalidateQueries({
        queryKey: books.list,
      });
      context.client.invalidateQueries({
        queryKey: books.details(bookId),
      });
      context.client.invalidateQueries({
        queryKey: readingRuns.byBook(bookId),
      });
      context.client.invalidateQueries({
        queryKey: readingSessions.byRun(runId),
      });
    },
  });
}
