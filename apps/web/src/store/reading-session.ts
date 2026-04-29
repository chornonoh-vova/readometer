import type { BookDetails } from "@/lib/books";
import type { ReadingSession } from "@/lib/reading-session";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReadingSessionState = {
  session: ReadingSession | null;
  start: (
    book: BookDetails,
    runId: string,
    startedAt: string,
    startPage: number,
  ) => void;
  pause: () => void;
  play: () => void;
  finish: () => void;
  cancel: () => void;
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

          if (state.session.paused) {
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

          if (!state.session.paused) {
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
      cancel: () => set(() => ({ session: null })),
    }),
    { name: "reading-session" },
  ),
);
