import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";

describe("GET /api/healthz", () => {
  it("returns 200 and a status payload", async () => {
    const response = await call("GET", "/api/healthz");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
