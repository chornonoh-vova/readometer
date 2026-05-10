import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./error";

describe("getErrorMessage", () => {
  it("returns string when not instance of error", () => {
    expect(getErrorMessage(1)).toEqual("1");
    expect(getErrorMessage({})).toEqual("[object Object]");
  });

  it("returns error message for errors with no cause", () => {
    expect(getErrorMessage(new Error("test"))).toEqual("test");
  });

  it("returns cause message for errors with cause", () => {
    expect(
      getErrorMessage(new Error("test", { cause: { message: "cause" } })),
    ).toEqual("cause");
    expect(
      getErrorMessage(new Error("test", { cause: new Error("cause") })),
    ).toEqual("cause");
  });

  it("fallbacks to error message when cause is not an object with message", () => {
    expect(getErrorMessage(new Error("test", { cause: "cause" }))).toEqual(
      "test",
    );
    expect(
      getErrorMessage(new Error("test", { cause: { test: "cause" } })),
    ).toEqual("test");
  });
});
