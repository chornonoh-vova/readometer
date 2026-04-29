import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WeekStart } from "@/lib/heatmap";

export type DisplayBy = "time" | "pages";

export type ReadingActivityState = {
  displayBy: DisplayBy;
  weekStart: WeekStart;
  setDisplayBy: (displayBy: DisplayBy) => void;
  setWeekStart: (weekStart: WeekStart) => void;
};

export const useReadingActivityStore = create<ReadingActivityState>()(
  persist(
    (set) => ({
      displayBy: "time",
      weekStart: "monday",
      setDisplayBy: (displayBy) => set({ displayBy }),
      setWeekStart: (weekStart) => set({ weekStart }),
    }),
    { name: "reading-activity" },
  ),
);
