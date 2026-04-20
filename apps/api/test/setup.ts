import { afterEach, beforeEach } from "vitest";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/database";
import { truncateAll } from "./helpers/truncate";
import { installAuthMock, setAuthenticatedUser } from "./mocks/auth";

installAuthMock();

beforeEach(async () => {
  setAuthenticatedUser(null);
  await truncateAll(db);
});

afterEach(() => {
  const storagePath = process.env.STORAGE_PATH;
  if (!storagePath) return;
  const coversDir = join(storagePath, "covers");
  try {
    for (const entry of readdirSync(coversDir)) {
      rmSync(join(coversDir, entry), { force: true });
    }
  } catch {
    // directory may not exist yet
  }
});
