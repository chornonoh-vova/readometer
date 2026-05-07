import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("readingRun")
    .alterColumn("status", (col) => col.setDefault("active"))
    .execute();

  await db.schema
    .alterTable("readingRun")
    .alterColumn("status", (col) => col.setNotNull())
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("readingRun")
    .alterColumn("status", (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable("readingRun")
    .alterColumn("status", (col) => col.dropDefault())
    .execute();
}
