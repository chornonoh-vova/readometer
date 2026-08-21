import { unlink } from "node:fs/promises";

const basePath = process.env.STORAGE_PATH;

/** Absolute path of one stored cover variant. */
export function coverPath(coverId: string, variant: "sm" | "md"): string {
  return `${basePath}/covers/${coverId}-${variant}.webp`;
}

/**
 * Removes both variants of a cover, tolerating files that are already gone.
 *
 * They legitimately can be: a manual cleanup, a half-failed write, a restore
 * from a backup that predates the upload. Before this, a missing file made
 * replacing a cover throw ENOENT and 500.
 */
export async function removeCoverFiles(coverId: string): Promise<void> {
  await Promise.all(
    (["sm", "md"] as const).map((variant) =>
      unlink(coverPath(coverId, variant)).catch(() => {}),
    ),
  );
}
