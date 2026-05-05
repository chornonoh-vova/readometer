import { sql } from "kysely";
import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("readingRun")
    .dropConstraint("readingRun_completedPages_check")
    .execute();

  await sql`ALTER TABLE "readingRun" ADD CONSTRAINT "readingRun_completedPages_check" CHECK ("completedPages" >= 0)`.execute(
    db,
  );
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("readingRun")
    .dropConstraint("readingRun_completedPages_check")
    .execute();

  await sql`ALTER TABLE "readingRun" ADD CONSTRAINT "readingRun_completedPages_check" CHECK ("completedPages" > 0)`.execute(
    db,
  );
}
