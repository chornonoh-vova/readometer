import { describe, expect, it } from "vitest";
import type { Book } from "./books";
import {
  activeBooksQueryOptions,
  getBookStatus,
  progressPercentage,
} from "./books";

describe("getBookStatus", () => {
  it.each([
    [0, 100, false, "to-read"],
    [0, 0, false, "to-read"],
    [1, 100, false, "in-progress"],
    [50, 100, false, "in-progress"],
    [99, 100, false, "in-progress"],
    [100, 100, false, "completed"],
  ])(
    "returns '%s' for %i/%i pages (not abandoned)",
    (completed, total, abandoned, expected) => {
      expect(getBookStatus(completed, total, abandoned)).toBe(expected);
    },
  );

  it("returns 'abandoned' for a run with progress that was abandoned", () => {
    expect(getBookStatus(50, 100, true)).toBe("abandoned");
  });

  it("returns 'to-read' (not 'abandoned') when abandoned with zero completed pages", () => {
    expect(getBookStatus(0, 100, true)).toBe("to-read");
  });
});

describe("activeBooksQueryOptions", () => {
  const makeBook = (overrides: Partial<Book>): Book => ({
    id: "1",
    userId: "u",
    title: "T",
    totalPages: 100,
    updatedAt: "",
    createdAt: "",
    completedPages: 50,
    lastRunId: "r",
    lastUpdatedAt: "",
    abandoned: false,
    ...overrides,
  });

  it("returns only in-progress books, excluding to-read, completed, and abandoned", () => {
    const allBooks = [
      makeBook({ completedPages: 0 }), // to-read
      makeBook({ completedPages: 50 }), // in-progress ← only this
      makeBook({ completedPages: 100 }), // completed
      makeBook({ completedPages: 50, abandoned: true }), // abandoned
    ];

    const { select } = activeBooksQueryOptions();
    const result = select!(allBooks);
    expect(result).toHaveLength(1);
    expect(result[0].completedPages).toBe(50);
    expect(result[0].abandoned).toBe(false);
  });
});

describe("progressPercentage", () => {
  it.each([
    [0, 100, 0],
    [50, 100, 50],
    [99, 100, 99],
    [100, 100, 100],
    [33, 100, 33],
  ])("returns %i%% for %i / %i", (completed, total, expected) => {
    expect(progressPercentage(completed, total)).toBe(expected);
  });

  it("floors fractional progress", () => {
    expect(progressPercentage(1, 3)).toBe(33);
    expect(progressPercentage(2, 3)).toBe(66);
  });

  it("returns 0 when totalPages is 0", () => {
    expect(progressPercentage(10, 0)).toBe(0);
  });

  it("clamps over-completion to 100", () => {
    expect(progressPercentage(150, 100)).toBe(100);
  });
});
