import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookFixture as book } from "../../test/fixtures";
import { useReadingSessionStore } from "./reading-session";

const startedAt = "2026-01-01T10:00:00.000Z";

beforeEach(() => {
  useReadingSessionStore.setState({ session: null });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(startedAt));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("start", () => {
  it("creates a fresh session", () => {
    useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);

    expect(useReadingSessionStore.getState().session).toEqual({
      book,
      runId: "run-1",
      paused: false,
      startedAt,
      startPage: 10,
      readTime: 0,
      lastPausedAt: null,
      lastContinuedAt: null,
    });
  });

  it("overwrites an existing session", () => {
    const { start } = useReadingSessionStore.getState();
    start(book, "run-1", startedAt, 10);
    start(book, "run-2", startedAt, 25);

    expect(useReadingSessionStore.getState().session?.runId).toBe("run-2");
    expect(useReadingSessionStore.getState().session?.startPage).toBe(25);
  });
});

describe("pause", () => {
  it("is a no-op when no session is active", () => {
    useReadingSessionStore.getState().pause();
    expect(useReadingSessionStore.getState().session).toBeNull();
  });

  it("accumulates readTime from startedAt on first pause", () => {
    useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);

    vi.setSystemTime(new Date("2026-01-01T10:05:00.000Z"));
    useReadingSessionStore.getState().pause();

    const { session } = useReadingSessionStore.getState();
    expect(session?.paused).toBe(true);
    expect(session?.readTime).toBe(300);
    expect(session?.lastPausedAt).toBe("2026-01-01T10:05:00.000Z");
    expect(session?.lastContinuedAt).toBeNull();
  });

  it("is a no-op when already paused", () => {
    useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);
    vi.setSystemTime(new Date("2026-01-01T10:05:00.000Z"));
    useReadingSessionStore.getState().pause();

    const before = useReadingSessionStore.getState().session;
    vi.setSystemTime(new Date("2026-01-01T10:10:00.000Z"));
    useReadingSessionStore.getState().pause();

    expect(useReadingSessionStore.getState().session).toEqual(before);
  });
});

describe("play", () => {
  it("is a no-op when no session is active", () => {
    useReadingSessionStore.getState().play();
    expect(useReadingSessionStore.getState().session).toBeNull();
  });

  it("is a no-op when not paused", () => {
    useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);
    const before = useReadingSessionStore.getState().session;

    vi.setSystemTime(new Date("2026-01-01T10:05:00.000Z"));
    useReadingSessionStore.getState().play();

    expect(useReadingSessionStore.getState().session).toEqual(before);
  });

  it("clears the paused state and stamps lastContinuedAt", () => {
    useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);
    vi.setSystemTime(new Date("2026-01-01T10:05:00.000Z"));
    useReadingSessionStore.getState().pause();

    vi.setSystemTime(new Date("2026-01-01T10:07:00.000Z"));
    useReadingSessionStore.getState().play();

    const { session } = useReadingSessionStore.getState();
    expect(session?.paused).toBe(false);
    expect(session?.lastPausedAt).toBeNull();
    expect(session?.lastContinuedAt).toBe("2026-01-01T10:07:00.000Z");
    expect(session?.readTime).toBe(300);
  });
});

describe("readTime accumulation", () => {
  it("adds across multiple pause/resume cycles", () => {
    useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);

    vi.setSystemTime(new Date("2026-01-01T10:05:00.000Z"));
    useReadingSessionStore.getState().pause();

    vi.setSystemTime(new Date("2026-01-01T10:10:00.000Z"));
    useReadingSessionStore.getState().play();

    vi.setSystemTime(new Date("2026-01-01T10:13:00.000Z"));
    useReadingSessionStore.getState().pause();

    expect(useReadingSessionStore.getState().session?.readTime).toBe(480);
  });
});

describe("finish / cancel", () => {
  it.each([["finish" as const], ["cancel" as const]])(
    "%s clears the session",
    (action) => {
      useReadingSessionStore.getState().start(book, "run-1", startedAt, 10);
      useReadingSessionStore.getState()[action]();
      expect(useReadingSessionStore.getState().session).toBeNull();
    },
  );
});
