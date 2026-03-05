import { describe, it, expect } from "vitest";
import { formatReadingTime } from "./format";

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
