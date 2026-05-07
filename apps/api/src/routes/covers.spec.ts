import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { call } from "../../test/helpers/request";
import { makeUser } from "../../test/helpers/factories";

function coversDir(): string {
  return join(process.env.STORAGE_PATH!, "covers");
}

describe("/api/covers static serving", () => {
  it("serves a file under STORAGE_PATH/covers", async () => {
    const user = await makeUser();
    mkdirSync(coversDir(), { recursive: true });
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    writeFileSync(join(coversDir(), "example.webp"), payload);

    const response = await call("GET", "/api/covers/example.webp", {
      as: user,
    });

    expect(response.status).toBe(200);
    const body = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(body)).toEqual(Array.from(payload));
    expect(response.headers.get("cache-control")).toBe(
      "private, immutable, max-age=604800, stale-while-revalidate=86400",
    );
    expect(response.headers.get("etag")).toMatch(/^".+"$/);
  });

  it("returns 404 without cache headers for a missing file", async () => {
    const user = await makeUser();

    const response = await call("GET", "/api/covers/does-not-exist.webp", {
      as: user,
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("returns 304 when If-None-Match matches the etag", async () => {
    const user = await makeUser();
    mkdirSync(coversDir(), { recursive: true });
    writeFileSync(
      join(coversDir(), "cached.webp"),
      new Uint8Array([10, 20, 30]),
    );

    const first = await call("GET", "/api/covers/cached.webp", { as: user });
    const etag = first.headers.get("etag")!;

    const second = await call("GET", "/api/covers/cached.webp", {
      as: user,
      headers: { "if-none-match": etag },
    });

    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
  });

  it("returns 200 with body when If-None-Match is stale", async () => {
    const user = await makeUser();
    mkdirSync(coversDir(), { recursive: true });
    const payload = new Uint8Array([99, 98, 97]);
    writeFileSync(join(coversDir(), "stale.webp"), payload);

    const response = await call("GET", "/api/covers/stale.webp", {
      as: user,
      headers: { "if-none-match": '"stale-value"' },
    });

    expect(response.status).toBe(200);
    const body = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(body)).toEqual(Array.from(payload));
  });

  it("rejects path-traversal attempts with 404", async () => {
    const user = await makeUser();

    const response = await call("GET", "/api/covers/..%2F..%2Fetc%2Fpasswd", {
      as: user,
    });

    expect(response.status).toBe(404);
  });
});
