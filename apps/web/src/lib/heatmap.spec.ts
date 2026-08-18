import { describe, expect, it } from "vitest";
import {
  getActivityMap,
  getActivityMonths,
  getActivityYears,
  getCalendarPosition,
  getMonthsRange,
  getRollingMonths,
  getYearMonths,
} from "./heatmap";
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

describe("getActivityYears", () => {
  it("lists years from the current one back to minYear", () => {
    expect(getActivityYears(new Date(2030, 3, 30))).toEqual([
      2030, 2029, 2028, 2027, 2026,
    ]);
  });

  it("lists only minYear during minYear itself", () => {
    expect(getActivityYears(new Date(2026, 7, 17))).toEqual([2026]);
  });

  it("returns an empty list before minYear rather than a negative range", () => {
    expect(getActivityYears(new Date(2025, 0, 1))).toEqual([]);
  });
});

describe("getRollingMonths", () => {
  it("starts at the current month and walks backwards across the year boundary", () => {
    const months = getRollingMonths(12, new Date(2026, 7, 17));
    expect(months).toHaveLength(12);
    expect(months.at(0)).toEqual({ year: 2026, month: 7 });
    expect(months.at(-1)).toEqual({ year: 2025, month: 8 });
  });

  it("ignores the day of month", () => {
    expect(getRollingMonths(2, new Date(2026, 0, 31))).toEqual(
      getRollingMonths(2, new Date(2026, 0, 1)),
    );
  });

  it("steps back one calendar month at a time", () => {
    expect(getRollingMonths(3, new Date(2026, 1, 5))).toEqual([
      { year: 2026, month: 1 },
      { year: 2026, month: 0 },
      { year: 2025, month: 11 },
    ]);
  });
});

describe("getYearMonths", () => {
  it("lists all twelve months of the year, December first", () => {
    const months = getYearMonths(2026);
    expect(months).toHaveLength(12);
    expect(months.at(0)).toEqual({ year: 2026, month: 11 });
    expect(months.at(-1)).toEqual({ year: 2026, month: 0 });
    expect(months.every(({ year }) => year === 2026)).toBe(true);
  });
});

describe("getActivityMonths", () => {
  it("rolls back from the current month when no year is selected", () => {
    const now = new Date(2026, 7, 17);
    expect(getActivityMonths(undefined, now)).toEqual(
      getRollingMonths(12, now),
    );
  });

  it("uses the selected year, ignoring the clock", () => {
    expect(getActivityMonths(2026, new Date(2030, 3, 30))).toEqual(
      getYearMonths(2026),
    );
  });
});

describe("getMonthsRange", () => {
  it("covers a rolling window with a half-open range", () => {
    expect(getMonthsRange(getRollingMonths(12, new Date(2026, 7, 17)))).toEqual(
      {
        from: "2025-09-01",
        to: "2026-09-01",
      },
    );
  });

  it("covers a whole selected year", () => {
    expect(getMonthsRange(getYearMonths(2026))).toEqual({
      from: "2026-01-01",
      to: "2027-01-01",
    });
  });

  it("rolls a December window over into the next January", () => {
    expect(getMonthsRange([{ year: 2026, month: 11 }])).toEqual({
      from: "2026-12-01",
      to: "2027-01-01",
    });
  });

  it("throws on an empty month list", () => {
    expect(() => getMonthsRange([])).toThrow();
  });
});
