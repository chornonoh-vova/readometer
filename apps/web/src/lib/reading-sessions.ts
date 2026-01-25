import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "./api";
import { booksQueryKey } from "./books";

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
  updatedAt: string;
  deletedAt: string | null;
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

async function addReadingSession(
  newReadingSession: NewReadingSession,
): Promise<ReadingSession> {
  const response = await fetchApi("/reading-sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newReadingSession),
  });
  if (!response.ok) {
    throw new Error("Network error");
  }
  return await response.json();
}

export function useAddReadingSessionMutation(bookId: string) {
  return useMutation({
    mutationFn: (newReadingSession: NewReadingSession) =>
      addReadingSession(newReadingSession),
    onSettled: (_data, _error, _variables, _onMutateResult, context) => {
      context.client.invalidateQueries({
        queryKey: [...booksQueryKey, bookId],
      });
    },
  });
}
