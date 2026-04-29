import { describe, expect, it } from "vitest";
import { getActivityMap, getCalendarPosition } from "./heatmap";
import type { ReadingActivity } from "./reading-activity";

describe("getActivityMap", () => {
  it("returns an empty map for empty input", () => {
    expect(getActivityMap([], 5).size).toBe(0);
  });

  it("keys entries by yyyy-MM-dd", () => {
    const input: ReadingActivity[] = [
      {
        date: "2026-04-15T08:00:00.000Z",
        totalReadPages: "10",
        totalReadTime: "600",
      },
    ];
    const map = getActivityMap(input, 5);
    expect(Array.from(map.keys())).toEqual(["2026-04-15"]);
  });

  it("coerces string totals to numbers", () => {
    const map = getActivityMap(
      [{ date: "2026-04-15", totalReadPages: "12", totalReadTime: "180" }],
      5,
    );
    const entry = map.get("2026-04-15")!;
    expect(entry.totalReadPages).toBe(12);
    expect(entry.totalReadTime).toBe(180);
  });

  it("places the day with max value into the highest bucket", () => {
    const map = getActivityMap(
      [
        { date: "2026-04-15", totalReadPages: "1", totalReadTime: "10" },
        { date: "2026-04-16", totalReadPages: "10", totalReadTime: "100" },
      ],
      5,
    );
    expect(map.get("2026-04-16")!.timeBucket).toBe(4);
    expect(map.get("2026-04-16")!.pagesBucket).toBe(4);
  });

  it("computes time and page buckets independently", () => {
    const map = getActivityMap(
      [
        { date: "2026-04-15", totalReadPages: "100", totalReadTime: "10" },
        { date: "2026-04-16", totalReadPages: "1", totalReadTime: "100" },
      ],
      5,
    );
    expect(map.get("2026-04-15")!.pagesBucket).toBe(4);
    expect(map.get("2026-04-15")!.timeBucket).toBe(1);
    expect(map.get("2026-04-16")!.pagesBucket).toBe(1);
    expect(map.get("2026-04-16")!.timeBucket).toBe(4);
  });

  it("respects the bucket count", () => {
    const map = getActivityMap(
      [{ date: "2026-04-15", totalReadPages: "10", totalReadTime: "100" }],
      3,
    );
    expect(map.get("2026-04-15")!.timeBucket).toBeLessThan(3);
  });
});

describe("getCalendarPosition", () => {
  it("places Monday at column 1 when week starts on Monday", () => {
    expect(getCalendarPosition(new Date(2026, 3, 13), "monday").col).toBe(1);
  });

  it("places Sunday at column 7 when week starts on Monday", () => {
    expect(getCalendarPosition(new Date(2026, 3, 19), "monday").col).toBe(7);
  });

  it("places Sunday at column 1 when week starts on Sunday", () => {
    expect(getCalendarPosition(new Date(2026, 3, 19), "sunday").col).toBe(1);
  });

  it("places Saturday at column 7 when week starts on Sunday", () => {
    expect(getCalendarPosition(new Date(2026, 3, 18), "sunday").col).toBe(7);
  });

  it("returns row 1 for the first week of the month", () => {
    expect(getCalendarPosition(new Date(2026, 3, 1), "monday").row).toBe(1);
  });

  it("returns increasing row numbers within the month", () => {
    const first = getCalendarPosition(new Date(2026, 3, 1), "monday");
    const mid = getCalendarPosition(new Date(2026, 3, 15), "monday");
    expect(mid.row).toBeGreaterThan(first.row);
  });
});
