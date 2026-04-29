import { describe, expect, it } from "vitest";
import { progressPercentage } from "./books";

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
