import { create } from "zustand";
import { persist } from "zustand/middleware";

type ReadingSessionState = {
  session: {
    runId: string;
    startedAt: string;
    startPage: number;
  } | null;
  start: (runId: string, startedAt: string, startPage: number) => void;
  finish: () => void;
};

export const useReadingSessionStore = create<ReadingSessionState>()(
  persist(
    (set) => ({
      session: null,
      start: (runId, startedAt, startPage) =>
        set(() => ({ session: { runId, startedAt, startPage } })),
      finish: () => set(() => ({ session: null })),
    }),
    { name: "reading-session" },
  ),
);
