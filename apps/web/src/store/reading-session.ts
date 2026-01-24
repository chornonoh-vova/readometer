import type { BookDetails } from "@/lib/books";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ReadingSessionState = {
  session: {
    book: BookDetails;
    runId: string;
    paused: boolean;
    startedAt: string;
    startPage: number;
    readTime: number;
    lastPausedAt: string | null;
    lastContinuedAt: string | null;
  } | null;
  start: (
    book: BookDetails,
    runId: string,
    startedAt: string,
    startPage: number,
  ) => void;
  pause: () => void;
  play: () => void;
  finish: () => void;
};

export const useReadingSessionStore = create<ReadingSessionState>()(
  persist(
    (set) => ({
      session: null,
      start: (book, runId, startedAt, startPage) =>
        set(() => ({
          session: {
            book,
            runId,
            paused: false,
            startedAt,
            startPage,
            readTime: 0,
            lastPausedAt: null,
            lastContinuedAt: null,
          },
        })),
      pause: () =>
        set((state) => {
          if (state.session === null) {
            return state;
          }

          const lastContinuedAt = state.session.lastContinuedAt
            ? new Date(state.session.lastContinuedAt)
            : new Date(state.session.startedAt);

          const lastPausedAt = new Date();

          const readTime =
            state.session.readTime +
            (lastPausedAt.getTime() / 1000 - lastContinuedAt.getTime() / 1000);

          return {
            session: {
              ...state.session,
              paused: true,
              readTime,
              lastPausedAt: lastPausedAt.toISOString(),
              lastContinuedAt: null,
            },
          };
        }),
      play: () =>
        set((state) => {
          if (state.session === null) {
            return state;
          }

          return {
            session: {
              ...state.session,
              paused: false,
              lastPausedAt: null,
              lastContinuedAt: new Date().toISOString(),
            },
          };
        }),
      finish: () => set(() => ({ session: null })),
    }),
    { name: "reading-session" },
  ),
);
