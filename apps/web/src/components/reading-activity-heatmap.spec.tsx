import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ReadingActivityHeatmap } from "./reading-activity-heatmap";
import { useReadingActivityStore } from "@/store/reading-activity";

beforeEach(() => {
  useReadingActivityStore.setState({
    displayBy: "time",
    weekStart: "monday",
  });
});

describe("ReadingActivityHeatmap", () => {
  it("renders all 12 month names", () => {
    render(<ReadingActivityHeatmap year={2026} readingActivity={[]} />);
    for (const name of [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("renders 366 day cells in a leap year", () => {
    const { container } = render(
      <ReadingActivityHeatmap year={2024} readingActivity={[]} />,
    );
    const grids = container.querySelectorAll(
      ".grid.grid-cols-\\[repeat\\(7\\,20px\\)\\]",
    );
    let totalDays = 0;
    grids.forEach((g) => {
      totalDays += g.children.length;
    });
    expect(totalDays).toBe(366);
  });

  it("renders 365 day cells in a non-leap year", () => {
    const { container } = render(
      <ReadingActivityHeatmap year={2026} readingActivity={[]} />,
    );
    const grids = container.querySelectorAll(
      ".grid.grid-cols-\\[repeat\\(7\\,20px\\)\\]",
    );
    let totalDays = 0;
    grids.forEach((g) => {
      totalDays += g.children.length;
    });
    expect(totalDays).toBe(365);
  });

  it("uses non-zero bucket class for days with activity", () => {
    render(
      <ReadingActivityHeatmap
        year={2026}
        readingActivity={[
          { date: "2026-04-15", totalReadPages: "20", totalReadTime: "600" },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: /Reading activity for 2026-04-15\. 20 pages, 10:00/,
    });
    expect(trigger.className).toMatch(/bg-activity-default-4/);
  });

  it("re-renders when displayBy changes in the store", () => {
    render(
      <ReadingActivityHeatmap
        year={2026}
        readingActivity={[
          { date: "2026-04-15", totalReadPages: "100", totalReadTime: "10" },
          { date: "2026-04-16", totalReadPages: "1", totalReadTime: "100" },
        ]}
      />,
    );

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
