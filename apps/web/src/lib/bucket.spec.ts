import { describe, expect, it } from "vitest";
import { getBucket } from "./bucket";

describe("getBucket", () => {
  it.each([
    [0, 100],
    [-5, 100],
    [10, 0],
    [10, -100],
  ])("returns 0 for invalid inputs value=%i max=%i", (value, max) => {
    expect(getBucket(value, max)).toBe(0);
  });

  it("places max value in the highest bucket", () => {
    expect(getBucket(100, 100)).toBe(4);
  });

  it("caps values above max to highest bucket", () => {
    expect(getBucket(150, 100)).toBe(4);
  });

  it.each([
    [1, 100, 1],
    [24, 100, 1],
    [25, 100, 2],
    [49, 100, 2],
    [50, 100, 3],
    [74, 100, 3],
    [75, 100, 4],
  ])("maps %i/%i to bucket %i", (value, max, expected) => {
    expect(getBucket(value, max)).toBe(expected);
  });

  it("works with different bucket counts", () => {
    expect(getBucket(50, 100, 3)).toBe(2);
    expect(getBucket(50, 100, 10)).toBeGreaterThan(1);
  });

  it("scales correctly for count=3", () => {
    expect(getBucket(1, 100, 3)).toBe(1);
    expect(getBucket(50, 100, 3)).toBe(2);
    expect(getBucket(100, 100, 3)).toBe(2);
  });

  it("is monotonic", () => {
    let prev = 0;

    for (let i = 1; i <= 100; i++) {
      const bucket = getBucket(i, 100);
      expect(bucket).toBeGreaterThanOrEqual(prev);
      prev = bucket;
    }
  });
});
