import { describe, expect, it } from "vitest";
import { computeRunStats } from "./run-stats";
import { makeReadingSession } from "../../test/fixtures";

describe("computeRunStats", () => {
  it("returns zeroes when there are no sessions", () => {
    expect(computeRunStats([])).toEqual({
      totalReadTime: 0,
      pagesPerHour: 0,
      averageLength: 0,
      readingDays: 0,
      longestStreak: 0,
    });
  });

  describe("pages per hour", () => {
    it("computes pages per hour from a single session", () => {
      const stats = computeRunStats([
        makeReadingSession({ readPages: 60, readTime: 3600 }),
      ]);
      expect(stats.pagesPerHour).toBe(60);
    });

    it("aggregates pages and time across sessions", () => {
      const stats = computeRunStats([
        makeReadingSession({ readPages: 30, readTime: 1800 }),
        makeReadingSession({ readPages: 90, readTime: 5400 }),
      ]);
      expect(stats.pagesPerHour).toBe(60);
    });

    it("rounds up to the nearest integer", () => {
      const stats = computeRunStats([
        makeReadingSession({ readPages: 100, readTime: 5400 }),
      ]);
      expect(stats.pagesPerHour).toBe(67);
    });

    it("rounds down to the nearest integer", () => {
      const stats = computeRunStats([
        makeReadingSession({ readPages: 50, readTime: 5400 }),
      ]);
      expect(stats.pagesPerHour).toBe(33);
    });
  });

  describe("total reading time", () => {
    it("equals the read time of a single session", () => {
      const stats = computeRunStats([makeReadingSession({ readTime: 3600 })]);
      expect(stats.totalReadTime).toBe(3600);
    });

    it("sums read time across sessions", () => {
      const stats = computeRunStats([
        makeReadingSession({ readTime: 3600 }),
        makeReadingSession({ readTime: 1800 }),
        makeReadingSession({ readTime: 600 }),
      ]);
      expect(stats.totalReadTime).toBe(6000);
    });
  });

  describe("average session length", () => {
    it("equals the total read time for a single session", () => {
      const stats = computeRunStats([makeReadingSession({ readTime: 1234 })]);
      expect(stats.averageLength).toBe(1234);
    });

    it("divides the total read time by the number of sessions", () => {
      const stats = computeRunStats([
        makeReadingSession({ readTime: 3600 }),
        makeReadingSession({ readTime: 1800 }),
      ]);
      expect(stats.averageLength).toBe(2700);
    });
  });

  describe("reading days", () => {
    it("counts a single day", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
      ]);
      expect(stats.readingDays).toBe(1);
    });

    it("counts a day with multiple sessions only once", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-10T20:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-12T09:00:00.000Z" }),
      ]);
      expect(stats.readingDays).toBe(2);
    });

    it("counts distinct days across sessions", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-15T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-20T09:00:00.000Z" }),
      ]);
      expect(stats.readingDays).toBe(3);
    });
  });

  describe("longest streak", () => {
    it("is 1 for a single reading day", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(1);
    });

    it("is 1 when no reading days are consecutive", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-12T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-14T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(1);
    });

    it("counts consecutive reading days", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-11T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-12T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(3);
    });

    it("picks the longest run when streaks are separated by gaps", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-01T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-02T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-11T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-12T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(3);
    });

    it("picks the longest run when it comes before a shorter one", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-01T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-02T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-03T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-11T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(3);
    });

    it("is not inflated by multiple sessions on the same day", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-10T20:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-11T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(2);
    });

    it("handles sessions arriving out of chronological order", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-03-12T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-10T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-03-11T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(3);
    });

    it("counts streaks across month boundaries", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-01-31T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-02-01T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(2);
    });

    it("counts streaks across year boundaries", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2023-12-31T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-01-01T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(2);
    });

    it("counts streaks across the US fall-back DST transition", () => {
      const stats = computeRunStats([
        makeReadingSession({ startTime: "2024-11-02T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-11-03T09:00:00.000Z" }),
        makeReadingSession({ startTime: "2024-11-04T09:00:00.000Z" }),
      ]);
      expect(stats.longestStreak).toBe(3);
    });
  });
});
