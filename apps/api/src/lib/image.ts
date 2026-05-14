import { inflateSync } from "node:zlib";

const decoder = new TextDecoder();

export async function extractAverageColor(file: File): Promise<string> {
  const png = await new Bun.Image(file).resize(1, 1).png().bytes();
  let pos = 8; // skip 8-byte PNG signature
  while (pos < png.length - 12) {
    const chunkLen = new DataView(png.buffer, png.byteOffset + pos).getUint32(
      0,
    );
    const type = decoder.decode(png.slice(pos + 4, pos + 8));
    if (type === "IDAT") {
      const raw = inflateSync(png.slice(pos + 8, pos + 8 + chunkLen));
      // raw[0] is the PNG row filter byte; R, G, B follow
      return (
        "#" +
        Array.from(raw.slice(1, 4))
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
      );
    }
    pos += 4 + 4 + chunkLen + 4;
  }
  throw new Error("extractAverageColor: no IDAT chunk found");
}

export async function resizeToWebP(
  file: File,
  width: number,
  quality: number,
  outputPath: string,
): Promise<void> {
  await new Bun.Image(file)
    .resize(width, undefined, { withoutEnlargement: true })
    .webp({ quality })
    .write(outputPath);
}
