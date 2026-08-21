/**
 * Removes WebP files under STORAGE_PATH/covers with no matching book.coverId.
 *
 * These accumulated because, before this change, deleting a book removed the
 * row and left its files behind. Run with `--apply`; the default is a dry run.
 */
import { readdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../src/lib/database.ts";

const apply = process.argv.includes("--apply");
const basePath = process.env.STORAGE_PATH;

if (!basePath) throw new Error("STORAGE_PATH is missing");

const coversDir = join(basePath, "covers");

const rows = await db
  .selectFrom("book")
  .select("coverId")
  .where("coverId", "is not", null)
  .execute();

const live = new Set(rows.map((r) => r.coverId));

const files = await readdir(coversDir).catch(() => [] as string[]);
let bytes = 0;
const orphans: string[] = [];

for (const file of files) {
  // Filenames are `${coverId}-sm.webp` / `${coverId}-md.webp`.
  const coverId = file.replace(/-(sm|md)\.webp$/, "");
  if (coverId === file) continue; // not a cover variant; leave it alone
  if (live.has(coverId)) continue;

  orphans.push(file);
  bytes += (await stat(join(coversDir, file))).size;
}

console.log(
  `${files.length} files, ${orphans.length} orphaned, ${(bytes / 1_048_576).toFixed(1)} MiB reclaimable`,
);

if (!apply) {
  console.log("dry run - pass --apply to delete");
} else {
  await Promise.all(orphans.map((f) => unlink(join(coversDir, f))));
  console.log(`deleted ${orphans.length} files`);
}

await db.destroy();
