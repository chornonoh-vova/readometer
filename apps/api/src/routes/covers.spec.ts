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
  });

  it("returns 404 for a missing file", async () => {
    const user = await makeUser();

    const response = await call("GET", "/api/covers/does-not-exist.webp", {
      as: user,
    });

    expect(response.status).toBe(404);
  });

  it("rejects path-traversal attempts with 404", async () => {
    const user = await makeUser();

    const response = await call("GET", "/api/covers/..%2F..%2Fetc%2Fpasswd", {
      as: user,
    });

    expect(response.status).toBe(404);
  });
});
