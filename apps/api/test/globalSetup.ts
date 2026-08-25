import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { mkdtempSync, rmSync, promises as fsPromises } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { exportPKCS8, generateKeyPair } from "jose";

/**
 * `auth.ts` signs a real client secret at import time, so a placeholder string
 * fails `importPKCS8` and takes every spec in the suite down with it. Escaped
 * newlines because that is the spelling a real deployment provides.
 */
async function appleTestPrivateKey(): Promise<string> {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  return (await exportPKCS8(privateKey)).replaceAll("\n", "\\n");
}

export default async function globalSetup() {
  const container = await new PostgreSqlContainer("postgres:18.1").start();
  const storageDir = mkdtempSync(join(tmpdir(), "readometer-test-"));

  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.STORAGE_PATH = storageDir;
  process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-at-least-32-chars";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.TRUSTED_ORIGINS = "http://localhost:3000";
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.APPLE_CLIENT_ID = "app.readometer.test";
  process.env.APPLE_TEAM_ID = "TESTTEAMID";
  process.env.APPLE_KEY_ID = "TESTKEYID0";
  process.env.APPLE_PRIVATE_KEY = await appleTestPrivateKey();
  process.env.APPLE_APP_BUNDLE_IDENTIFIER = "app.readometer.test.ios";
  process.env.NODE_ENV = "test";
  process.env.TZ = "UTC";

  const { db } = await import("../src/lib/database");

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: fsPromises,
      path: { join },
      migrationFolder: join(import.meta.dirname, "../src/migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach(({ status, migrationName }) => {
    if (status === "Success") {
      console.log(`migration "${migrationName}" was executed successfully`);
    } else if (status === "Error") {
      console.error(`failed to execute migration "${migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  return async () => {
    const { pool } = await import("../src/lib/database");
    await pool.end();
    await container.stop();
    rmSync(storageDir, { recursive: true, force: true });
  };
}
