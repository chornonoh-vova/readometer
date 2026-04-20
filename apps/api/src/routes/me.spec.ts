import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";
import { makeUser } from "../../test/helpers/factories";

describe("GET /api/me", () => {
  it("returns 401 when unauthenticated", async () => {
    const response = await call("GET", "/api/me");

    expect(response.status).toBe(401);
  });

  it("returns the user and session for an authenticated caller", async () => {
    const user = await makeUser();

    const response = await call("GET", "/api/me", { as: user });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      user: { id: string; email: string };
      session: { userId: string };
    };
    expect(body.user.id).toBe(user.id);
    expect(body.user.email).toBe(user.email);
    expect(body.session.userId).toBe(user.id);
  });
});
