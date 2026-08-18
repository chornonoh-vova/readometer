import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ReadingActivityHeatmap } from "./reading-activity-heatmap";
import { useReadingActivityStore } from "@/store/reading-activity";
import {
  getRollingMonths,
  getYearMonths,
  type HeatmapMonth,
} from "@/lib/heatmap";
import type { ReadingActivity } from "@/lib/reading-activity";

beforeEach(() => {
  useReadingActivityStore.setState({
    displayBy: "time",
    weekStart: "monday",
  });
});

function renderHeatmap(
  months: HeatmapMonth[],
  readingActivity: ReadingActivity[] = [],
) {
  return render(
    <ReadingActivityHeatmap
      months={months}
      readingActivity={readingActivity}
    />,
  );
}

function monthHeadings(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('[data-slot="month-label"]'),
  ).map((label) => label.textContent);
}

function countDayCells() {
  return screen.getAllByText(/^No reading activity for /).length;
}

describe("ReadingActivityHeatmap", () => {
  it("renders a selected year's months newest first, without the year", () => {
    const { container } = renderHeatmap(getYearMonths(2026));
    expect(monthHeadings(container)).toEqual([
      "December",
      "November",
      "October",
      "September",
      "August",
      "July",
      "June",
      "May",
      "April",
      "March",
      "February",
      "January",
    ]);
  });

  it("labels months with their year when the window crosses a year boundary", () => {
    const { container } = renderHeatmap(
      getRollingMonths(12, new Date(2026, 7, 17)),
    );
    const headings = monthHeadings(container);
    expect(headings.at(0)).toBe("Aug 2026");
    expect(headings.at(-1)).toBe("Sep 2025");
    expect(headings).toHaveLength(12);
  });

  it("renders 366 day cells in a leap year", () => {
    renderHeatmap(getYearMonths(2024));
    expect(countDayCells()).toBe(366);
  });

  it("renders 365 day cells in a non-leap year", () => {
    renderHeatmap(getYearMonths(2026));
    expect(countDayCells()).toBe(365);
  });

  it("includes the leap day when a rolling window spans it", () => {
    renderHeatmap(getRollingMonths(12, new Date(2024, 4, 15)));
    expect(countDayCells()).toBe(366);
  });

  it("uses non-zero bucket class for days with activity", () => {
    renderHeatmap(getYearMonths(2026), [
      { date: "2026-04-15", totalReadPages: "20", totalReadTime: "600" },
    ]);
    const trigger = screen.getByRole("button", {
      name: /Reading activity for 2026-04-15\. 20 pages, 10:00/,
    });
    expect(trigger.className).toMatch(/bg-activity-default-4/);
  });

  it("re-renders when displayBy changes in the store", () => {
    renderHeatmap(getYearMonths(2026), [
      { date: "2026-04-15", totalReadPages: "100", totalReadTime: "10" },
      { date: "2026-04-16", totalReadPages: "1", totalReadTime: "100" },
    ]);

    const before = screen.getByRole("button", {
      name: /Reading activity for 2026-04-15/,
    });
    expect(before.className).toMatch(/bg-activity-default-1/);

    act(() => {
      useReadingActivityStore.getState().setDisplayBy("pages");
    });

    const after = screen.getByRole("button", {
      name: /Reading activity for 2026-04-15/,
    });
    expect(after.className).toMatch(/bg-activity-default-4/);
  });
});
