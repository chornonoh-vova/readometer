import { sql, type Kysely } from "kysely";
import type { DB } from "../../src/lib/db.d.ts";

export async function truncateAll(db: Kysely<DB>) {
  await sql`TRUNCATE TABLE
    "readingSession",
    "readingRun",
    "book",
    "goal",
    "account",
    "user"
    RESTART IDENTITY CASCADE`.execute(db);
}
