import { describe, expect, it } from "vitest";
import { bookCover } from "./cover";

describe("bookCover", () => {
  it("returns undefined when the book has no coverId", () => {
    expect(
      bookCover({ title: "Foo", coverId: undefined }, "sm"),
    ).toBeUndefined();
  });

  it("builds a small cover URL", () => {
    expect(bookCover({ title: "Foo", coverId: "abc" }, "sm")).toEqual({
      src: "/api/covers/abc-sm.webp",
      alt: "Cover image for book Foo",
    });
  });

  it("builds a medium cover URL", () => {
    expect(bookCover({ title: "Foo", coverId: "abc" }, "md")).toEqual({
      src: "/api/covers/abc-md.webp",
      alt: "Cover image for book Foo",
    });
  });

  it("includes the book title in the alt text", () => {
    expect(
      bookCover({ title: "The Pragmatic Programmer", coverId: "x" }, "sm"),
    ).toMatchObject({
      alt: "Cover image for book The Pragmatic Programmer",
    });
  });
});
