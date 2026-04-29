import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookFixture } from "../../test/fixtures";
import { getReadingTime, type ReadingSession } from "./reading-session";

const startedAt = "2026-01-01T10:00:00.000Z";

const baseSession: ReadingSession = {
  book: bookFixture,
  runId: "run-1",
  paused: false,
  startedAt,
  startPage: 0,
  readTime: 0,
  lastPausedAt: null,
  lastContinuedAt: null,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T10:01:30.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getReadingTime", () => {
  it("returns 0 for a null session", () => {
    expect(getReadingTime(null)).toBe(0);
  });

  it("returns the stored readTime when paused", () => {
    expect(
      getReadingTime({
        ...baseSession,
        paused: true,
        readTime: 240,
        lastPausedAt: "2026-01-01T10:04:00.000Z",
      }),
    ).toBe(240);
  });

  it("uses startedAt when there is no lastContinuedAt", () => {
    expect(getReadingTime(baseSession)).toBe(90);
  });

  it("uses lastContinuedAt over startedAt when set", () => {
    expect(
      getReadingTime({
        ...baseSession,
        lastContinuedAt: "2026-01-01T10:01:00.000Z",
      }),
    ).toBe(30);
  });

  it("adds the live tick onto stored readTime when running", () => {
    expect(
      getReadingTime({
        ...baseSession,
        readTime: 100,
        lastContinuedAt: "2026-01-01T10:01:00.000Z",
      }),
    ).toBe(130);
  });
});
