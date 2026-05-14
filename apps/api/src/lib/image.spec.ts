import { describe, it, expect, afterEach } from "vitest";
import { extractAverageColor, resizeToWebP } from "./image";
import { makeSolidPng } from "../../test/helpers/png";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

function makeFile(data: Uint8Array, name = "test.png"): File {
  return new File([data], name, { type: "image/png" });
}

describe("extractAverageColor", () => {
  it("returns correct hex for a solid red image", async () => {
    const file = makeFile(makeSolidPng(64, 64, 255, 0, 0));
    expect(await extractAverageColor(file)).toBe("#ff0000");
  });

  it("returns correct hex for a solid blue image", async () => {
    const file = makeFile(makeSolidPng(64, 64, 0, 0, 255));
    expect(await extractAverageColor(file)).toBe("#0000ff");
  });

  it("returns a valid 6-digit hex for an arbitrary color", async () => {
    const file = makeFile(makeSolidPng(64, 64, 100, 150, 200));
    expect(await extractAverageColor(file)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("resizeToWebP", () => {
  const outPath = join(process.env.STORAGE_PATH!, "test-resize.webp");

  afterEach(async () => {
    if (existsSync(outPath)) await unlink(outPath);
  });

  it("writes a WebP file to the given path", async () => {
    const file = makeFile(makeSolidPng(200, 200, 100, 100, 100));
    await resizeToWebP(file, 100, 85, outPath);
    expect(existsSync(outPath)).toBe(true);
  });
});
