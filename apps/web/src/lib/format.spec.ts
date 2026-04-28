import { describe, it, expect } from "vitest";
import {
  buildPartialDate,
  formatPartialDate,
  formatReadingTime,
  splitPartialDate,
} from "./format";

describe("formatReadingTime", () => {
  const groupedCases = {
    "seconds only": [
      { input: 0, expected: "00:00" },
      { input: 5, expected: "00:05" },
      { input: 45, expected: "00:45" },
    ],

    "minutes and seconds": [
      { input: 60, expected: "01:00" },
      { input: 61, expected: "01:01" },
      { input: 65, expected: "01:05" },
      { input: 125, expected: "02:05" },
      { input: 3599, expected: "59:59" },
    ],

    "boundary transitions": [
      { input: 59, expected: "00:59" },
      { input: 60, expected: "01:00" },
      { input: 61, expected: "01:01" },
    ],

    "hours, minutes and seconds": [
      { input: 3600, expected: "1:00:00" },
      { input: 3605, expected: "1:00:05" },
      { input: 3665, expected: "1:01:05" },
      { input: 7325, expected: "2:02:05" },
    ],
  };

  Object.entries(groupedCases).forEach(([group, cases]) => {
    describe(`format: ${group}`, () => {
      cases.forEach(({ input, expected }) => {
        it(`formats ${input}s -> ${expected}`, () => {
          expect(formatReadingTime(input)).toBe(expected);
        });
      });
    });
  });
});

describe("buildPartialDate", () => {
  it("returns undefined when year is missing", () => {
    expect(buildPartialDate(undefined, undefined, undefined)).toBeUndefined();
    expect(buildPartialDate(undefined, 4, 15)).toBeUndefined();
  });

  it("returns YYYY when only year is given", () => {
    expect(buildPartialDate(2020, undefined, undefined)).toBe("2020");
  });

  it("returns YYYY-MM when year and month are given", () => {
    expect(buildPartialDate(2020, 4, undefined)).toBe("2020-04");
  });

  it("returns YYYY-MM-DD when all parts are given", () => {
    expect(buildPartialDate(2020, 4, 5)).toBe("2020-04-05");
  });

  it("zero-pads month, day, and year", () => {
    expect(buildPartialDate(7, 1, 2)).toBe("0007-01-02");
  });
});

describe("splitPartialDate", () => {
  it("returns empty parts for undefined", () => {
    expect(splitPartialDate(undefined)).toEqual({
      year: "",
      month: "",
      day: "",
    });
  });

  it("returns empty parts for empty string", () => {
    expect(splitPartialDate("")).toEqual({ year: "", month: "", day: "" });
  });

  it("splits a year-only string", () => {
    expect(splitPartialDate("2020")).toEqual({
      year: "2020",
      month: "",
      day: "",
    });
  });

  it("splits a year-month string", () => {
    expect(splitPartialDate("2020-04")).toEqual({
      year: "2020",
      month: "04",
      day: "",
    });
  });

  it("splits a full date string", () => {
    expect(splitPartialDate("2020-04-15")).toEqual({
      year: "2020",
      month: "04",
      day: "15",
    });
  });
});

describe("formatPartialDate", () => {
  it.each(["2020", "2020-04", "2020-04-15"])("renders %s as-is", (value) => {
    expect(formatPartialDate(value)).toBe(value);
  });
});
