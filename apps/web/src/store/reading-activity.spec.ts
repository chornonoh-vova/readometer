import { beforeEach, describe, expect, it } from "vitest";
import { useReadingActivityStore } from "./reading-activity";

const STORAGE_KEY = "reading-activity";

beforeEach(() => {
  useReadingActivityStore.setState({
    displayBy: "time",
    weekStart: "monday",
  });
});

describe("defaults", () => {
  it("starts at time / monday", () => {
    expect(useReadingActivityStore.getState().displayBy).toBe("time");
    expect(useReadingActivityStore.getState().weekStart).toBe("monday");
  });
});

describe("setters", () => {
  it("setDisplayBy updates displayBy", () => {
    useReadingActivityStore.getState().setDisplayBy("pages");
    expect(useReadingActivityStore.getState().displayBy).toBe("pages");
  });

  it("setWeekStart updates weekStart", () => {
    useReadingActivityStore.getState().setWeekStart("sunday");
    expect(useReadingActivityStore.getState().weekStart).toBe("sunday");
  });
});

describe("persistence", () => {
  it("writes the persisted state to localStorage under reading-activity", () => {
    useReadingActivityStore.getState().setDisplayBy("pages");
    useReadingActivityStore.getState().setWeekStart("sunday");

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.state).toMatchObject({
      displayBy: "pages",
      weekStart: "sunday",
    });
  });
});
