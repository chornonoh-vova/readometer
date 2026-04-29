import type { BookDetails } from "./books";

export type ReadingSession = {
  book: BookDetails;
  runId: string;
  paused: boolean;
  startedAt: string;
  startPage: number;
  readTime: number;
  lastPausedAt: string | null;
  lastContinuedAt: string | null;
};

export function getReadingTime(session: ReadingSession | null): number {
  if (!session) return 0;

  if (session.paused) return session.readTime;

  const lastContinuedAt = session.lastContinuedAt
    ? new Date(session.lastContinuedAt)
    : new Date(session.startedAt);

  const current = new Date();

  return (
    session.readTime +
    (current.getTime() / 1000 - lastContinuedAt.getTime() / 1000)
  );
}
