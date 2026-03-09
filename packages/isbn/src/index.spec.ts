import { describe, it, expect } from "bun:test";
import {
  isbn10ToIsbn13,
  isbnSchema,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbnToIsbn13,
  stripIsbn,
} from ".";

describe("stripIsbn", () => {
  it.each([
    ["978-1-60309-452-8", "9781603094528"],
    ["978 1 60309 452 8", "9781603094528"],
    ["0-306-40615-2", "0306406152"],
    ["0-8044-2957-x", "080442957X"],
  ])("normalizes %s -> %s", (input, expected) => {
    expect(stripIsbn(input)).toBe(expected);
  });
});

describe("isValidIsbn10", () => {
  it.each(["0306406152", "080442957X", "0140449116"])(
    "accepts valid ISBN-10 %s",
    (isbn) => {
      expect(isValidIsbn10(isbn)).toBe(true);
    },
  );

  it.each(["0306406153", "1234567890", "ABCDEFGHIJ", "123"])(
    "rejects invalid ISBN-10 %s",
    (isbn) => {
      expect(isValidIsbn10(isbn)).toBe(false);
    },
  );

  it("accepts X as check digit", () => {
    expect(isValidIsbn10("080442957X")).toBe(true);
  });
});

describe("isValidIsbn13", () => {
  it.each(["9780306406157", "9780140449112", "9781603094528"])(
    "accepts valid ISBN-13 %s",
    (isbn) => {
      expect(isValidIsbn13(isbn)).toBe(true);
    },
  );

  it.each(["9780306406158", "9781234567890", "ABCDEFGHIJKLM", "123"])(
    "rejects invalid ISBN-13 %s",
    (isbn) => {
      expect(isValidIsbn13(isbn)).toBe(false);
    },
  );
});

describe("isbn10ToIsbn13", () => {
  it.each([
    ["0306406152", "9780306406157"],
    ["0140449116", "9780140449112"],
  ])("%s -> %s", (isbn10, expected) => {
    expect(isbn10ToIsbn13(isbn10)).toBe(expected);
  });
});

describe("normalizeIsbnToIsbn13", () => {
  it("returns null for empty input", () => {
    expect(normalizeIsbnToIsbn13()).toBeNull();
    expect(normalizeIsbnToIsbn13(null)).toBeNull();
  });

  it("normalizes ISBN-13", () => {
    expect(normalizeIsbnToIsbn13("978-0306406157")).toBe("9780306406157");
  });

  it("converts valid ISBN-10 to ISBN-13", () => {
    expect(normalizeIsbnToIsbn13("0306406152")).toBe("9780306406157");
  });

  it("returns null for invalid ISBN", () => {
    expect(normalizeIsbnToIsbn13("123")).toBeNull();
  });

  it("handles messy formatting", () => {
    expect(normalizeIsbnToIsbn13(" 978 - 0 - 306 - 40615 - 7 ")).toBe(
      "9780306406157",
    );
  });
});

describe("isbnSchema", () => {
  it("accepts empty string", () => {
    expect(isbnSchema.safeParse("").success).toBe(true);
  });

  it("accepts valid ISBNs", () => {
    expect(isbnSchema.safeParse("0306406152").success).toBe(true);
    expect(isbnSchema.safeParse("9780306406157").success).toBe(true);
  });

  it("rejects invalid ISBNs", () => {
    expect(isbnSchema.safeParse("123").success).toBe(false);
    expect(isbnSchema.safeParse("abcdefghij").success).toBe(false);
  });
});
