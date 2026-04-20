import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";

describe("GET /api/readyz", () => {
  it("returns 200 when the database is reachable", async () => {
    const response = await call("GET", "/api/readyz");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });
});
