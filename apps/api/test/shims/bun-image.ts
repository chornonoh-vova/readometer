import { inflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { makeSolidPng } from "../helpers/png";

export function installBunImagePolyfill(): void {
  if ((globalThis as { Bun?: { Image?: unknown } }).Bun?.Image) return;

  class BunImagePolyfill {
    #file: File;
    constructor(file: File) {
      this.#file = file;
    }
    resize() {
      return this;
    }
    webp() {
      return this;
    }
    png() {
      return this;
    }
    async bytes(): Promise<Uint8Array> {
      // Extract the first pixel from the source PNG to approximate average color.
      // This is exact for solid-color images (all test inputs) and reasonable for photos.
      const buf = Buffer.from(await this.#file.arrayBuffer());
      let pos = 8; // skip PNG signature
      while (pos < buf.length - 12) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString("ascii", pos + 4, pos + 8);
        if (type === "IDAT") {
          const raw = inflateSync(buf.subarray(pos + 8, pos + 8 + len));
          // raw[0] is the PNG row filter byte; R, G, B follow
          return makeSolidPng(
            1,
            1,
            raw.at(1) ?? 128,
            raw.at(2) ?? 128,
            raw.at(3) ?? 128,
          );
        }
        pos += 4 + 4 + len + 4;
      }
      return makeSolidPng(1, 1, 128, 128, 128);
    }
    async write(path: string): Promise<number> {
      const buf = Buffer.from(await this.#file.arrayBuffer());
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, buf);
      return buf.length;
    }
  }

  const g = globalThis as { Bun?: { Image?: unknown } };
  g.Bun = { ...(g.Bun ?? {}), Image: BunImagePolyfill };
}
