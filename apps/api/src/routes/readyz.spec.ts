import { describe, it, expect, vi, afterEach } from "vitest";
import { call } from "../../test/helpers/request";
import { redisMock } from "../../test/mocks/redis";

describe("GET /api/readyz", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 when the database and redis are reachable", async () => {
    const response = await call("GET", "/api/readyz");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });

  it("returns 503 when redis is unreachable", async () => {
    vi.spyOn(redisMock, "ping").mockRejectedValueOnce(
      new Error("connection refused"),
    );

    const response = await call("GET", "/api/readyz");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not-ready" });
  });
});
