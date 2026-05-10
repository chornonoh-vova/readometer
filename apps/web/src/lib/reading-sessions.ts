import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { fetchApi } from "./api";
import { books, goals, readingRuns, readingSessions } from "./query-keys";

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

export type NewReadingSession = Pick<
  ReadingSession,
  | "id"
  | "runId"
  | "startPage"
  | "endPage"
  | "startTime"
  | "endTime"
  | "readTime"
>;

export type UpdatedReadingSession = Pick<
  ReadingSession,
  "startPage" | "endPage"
> & {
  updateRun: boolean;
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

export function useAddReadingSessionMutation(bookId: string | undefined) {
  return useMutation({
    mutationFn: (newReadingSession: NewReadingSession) =>
      addReadingSession(newReadingSession),
    onSuccess: (_data, variables, _onMutateResult, context) => {
      const { runId } = variables;
      context.client.invalidateQueries({
        queryKey: books.list,
      });
      if (bookId) {
        context.client.invalidateQueries({
          queryKey: books.details(bookId),
        });
        context.client.invalidateQueries({
          queryKey: readingRuns.byBook(bookId),
        });
      }
      context.client.invalidateQueries({
        queryKey: readingSessions.byRun(runId),
      });
      context.client.invalidateQueries({
        queryKey: goals.list,
      });
    },
  });
}

async function editReadingSession(
  sessionId: string,
  updatedReadingSession: UpdatedReadingSession,
): Promise<ReadingSession> {
  return fetchApi(`/reading-sessions/${sessionId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedReadingSession),
  });
}

export function useEditReadingSessionMutation(
  sessionId: string,
  runId: string,
  bookId: string,
) {
  return useMutation({
    mutationFn: (updatedReadingSession: UpdatedReadingSession) =>
      editReadingSession(sessionId, updatedReadingSession),
    onSuccess: (_data, _variables, _onMutateResult, context) => {
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
      context.client.invalidateQueries({
        queryKey: goals.list,
      });
    },
  });
}

async function deleteReadingSession(sessionId: string): Promise<void> {
  return fetchApi(`/reading-sessions/${sessionId}`, {
    method: "DELETE",
    noContent: true,
  });
}

export function useDeleteReadingSessionMutation(
  sessionId: string,
  runId: string,
  bookId: string,
) {
  return useMutation({
    mutationFn: () => deleteReadingSession(sessionId),
    onSuccess: (_data, _variables, _onMutateResult, context) => {
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
      context.client.invalidateQueries({
        queryKey: goals.list,
      });
    },
  });
}
