import { useMutation } from "@tanstack/react-query";
import { booksQueryKey } from "./books";

export type ReadingRun = {
  id: string;
  userId: string;
  bookId: string;
  completedPages: number;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  deletedAt: string | null;
};

export type NewReadingRun = {
  id: string;
  bookId: string;
  completedPages: number;
  startedAt: string;
  updatedAt: string;
};

async function addReadingRun(
  newReadingRun: NewReadingRun,
): Promise<ReadingRun> {
  const response = await fetch("/api/reading-runs/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newReadingRun),
  });
  if (!response.ok) {
    throw new Error("Network error");
  }
  return await response.json();
}

export function useAddReadingRunMutation() {
  return useMutation({
    mutationFn: (newReadingRun: NewReadingRun) => addReadingRun(newReadingRun),
    onSettled: (_data, _error, variables, _onMutateResult, context) => {
      const bookId = variables.bookId;
      context.client.invalidateQueries({
        queryKey: [...booksQueryKey, bookId],
      });
    },
  });
}
