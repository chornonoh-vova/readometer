import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";
import { makeUser } from "../../test/helpers/factories";

describe("requireAuth", () => {
  it("returns 401 when there is no session", async () => {
    const response = await call("GET", "/api/me");

    expect(response.status).toBe(401);
  });

  it("returns 403 when the caller's email is not verified", async () => {
    const user = await makeUser({ emailVerified: false });

    const response = await call("GET", "/api/me", { as: user });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Forbidden" });
  });

  it("returns a generic 403 when the caller is banned", async () => {
    const user = await makeUser({ banned: true });

    const response = await call("GET", "/api/me", { as: user });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Forbidden" });
  });

  it("is indistinguishable from an unverified rejection", async () => {
    const user = await makeUser({ banned: true, emailVerified: false });

    const response = await call("GET", "/api/me", { as: user });

    expect(await response.json()).toEqual({ message: "Forbidden" });
  });

  it("lets a verified caller through", async () => {
    const user = await makeUser({ emailVerified: true });

    const response = await call("GET", "/api/me", { as: user });

    expect(response.status).toBe(200);
  });

  // The flood this gate exists to stop: 111k book inserts from unverified accounts.
  it("blocks book creation for an unverified caller", async () => {
    const user = await makeUser({ emailVerified: false });

    const response = await call("POST", "/api/books", {
      as: user,
      body: { title: "Spam", totalPages: 100 },
    });

    expect(response.status).toBe(403);
  });

  // requireAuth is mounted with app.use("*") AFTER healthz/readyz and the
  // better-auth handler, so Hono's registration order leaves those reachable.
  // If someone moves that line, these fail rather than silently locking users
  // out of verifying or breaking container healthchecks.
  it("leaves healthchecks reachable for an unverified caller", async () => {
    const user = await makeUser({ emailVerified: false });

    const healthz = await call("GET", "/api/healthz", { as: user });
    const readyz = await call("GET", "/api/readyz", { as: user });

    expect(healthz.status).toBe(200);
    expect(readyz.status).toBe(200);
  });

  it("leaves the auth endpoints reachable for an unverified caller", async () => {
    const user = await makeUser({ emailVerified: false });

    const response = await call("GET", "/api/auth/get-session", { as: user });

    expect(response.status).not.toBe(403);
  });
});
