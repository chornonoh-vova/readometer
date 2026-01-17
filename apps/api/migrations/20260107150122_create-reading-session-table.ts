import { sql } from "kysely";
import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("readingSession")
    .addColumn("id", "uuid", (col) => col.primaryKey().notNull())
    .addColumn("runId", "uuid", (col) =>
      col.notNull().references("readingRun.id").onDelete("cascade"),
    )
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("readPages", "integer", (col) =>
      col.notNull().check(sql`"readPages" >= 0`),
    )
    .addColumn("startPage", "integer")
    .addColumn("endPage", "integer")
    .addColumn("readTime", "integer", (col) =>
      col.notNull().check(sql`"readTime" >= 0`),
    )
    .addColumn("startTime", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("endTime", "timestamptz")
    .addColumn("deletedAt", "timestamptz")
    .addColumn("updatedAt", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("readingSession_userId_updatedAt_idx")
    .on("readingSession")
    .columns(["userId", "updatedAt"])
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("readingSession_userId_updatedAt_idx").execute();

  await db.schema.dropTable("readingSession").execute();
}
