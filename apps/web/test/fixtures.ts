import type { BookDetails } from "@/lib/books";
import type { ReadingSession } from "@/lib/reading-sessions";

let readingSessionId = 0;

export function makeReadingSession(
  overrides: Partial<ReadingSession> = {},
): ReadingSession {
  readingSessionId += 1;
  return {
    id: `session-${readingSessionId}`,
    userId: "user-1",
    runId: "run-1",
    startPage: 0,
    endPage: 50,
    readPages: 50,
    startTime: "2024-03-10T09:00:00.000Z",
    endTime: "2024-03-10T10:00:00.000Z",
    readTime: 3600,
    ...overrides,
  };
}

export const bookFixture: BookDetails = {
  id: "book-1",
  userId: "user-1",
  title: "Test Book",
  totalPages: 200,
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};
