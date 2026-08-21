import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";
import { limitForPath } from "./bodyLimit";
import { BODY_LIMITS } from "../lib/limits";

describe("limitForPath", () => {
  it.each([
    ["/api/auth/sign-up/email", "auth"],
    ["/api/auth/sign-in/email", "auth"],
    ["/api/books/01999999-9999-7999-8999-999999999999/cover", "upload"],
    ["/api/books", "json"],
    ["/api/books/01999999-9999-7999-8999-999999999999", "json"],
    ["/api/reading-sessions", "json"],
    ["/api/goals", "json"],
  ])("maps %s to the %s tier", (path, expected) => {
    expect(limitForPath(path)).toBe(expected);
  });

  it("does not treat a nested path under cover as an upload", () => {
    expect(limitForPath("/api/books/abc/cover/extra")).toBe("json");
  });

  it("does not treat a path merely containing 'auth' as the auth tier", () => {
    expect(limitForPath("/api/books/authors")).toBe("json");
  });
});

describe("request body limits (integration)", () => {
  it("rejects an oversized JSON body with 413 before auth runs", async () => {
    const response = await call("POST", "/api/books", {
      body: { title: "x".repeat(BODY_LIMITS.json + 1_000) },
    });

    expect(response.status).toBe(413);
    const body = (await response.json()) as { message: string };
    expect(body.message).toBe("Request body too large");
  });

  it("rejects an oversized signup body with 413", async () => {
    const response = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "x".repeat(BODY_LIMITS.auth + 1_000),
        email: "probe@example.com",
        password: "correct horse battery staple",
      },
    });

    expect(response.status).toBe(413);
  });

  it("allows a body under the JSON limit through to normal handling", async () => {
    const response = await call("POST", "/api/books", {
      body: { title: "ok" },
    });

    // 401, not 413: the limit passed and requireAuth rejected it instead.
    expect(response.status).toBe(401);
  });
});
