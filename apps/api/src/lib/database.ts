import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { Pool } from "pg";
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import type { DB } from "./db.d.ts";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: { readdir },
      path: { join },
      migrationFolder: join(process.cwd(), "migrations"),
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
}
