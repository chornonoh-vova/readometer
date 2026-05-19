import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "./db.d.ts";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});
