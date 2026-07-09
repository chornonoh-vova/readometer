import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "./db.d.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database URL isn't configured");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});
