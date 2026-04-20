import { sql, type Kysely } from "kysely";
import type { DB } from "../../src/lib/db.d.ts";

export async function truncateAll(db: Kysely<DB>) {
  await sql`TRUNCATE TABLE
    "readingSession",
    "readingRun",
    "book",
    "session",
    "account",
    "verification",
    "user"
    RESTART IDENTITY CASCADE`.execute(db);
}
