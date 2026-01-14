import { sql } from "kysely";
import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("readingRun")
    .addColumn("id", "uuid", (col) => col.primaryKey().notNull())
    .addColumn("bookId", "uuid", (col) =>
      col.notNull().references("book.id").onDelete("cascade"),
    )
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("completedPages", "integer", (col) =>
      col.notNull().check(sql`"completedPages" > 0`),
    )
    .addColumn("startedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("finishedAt", "timestamptz")
    .addColumn("deletedAt", "timestamptz")
    .addColumn("updatedAt", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("readingRun_userId_updatedAt_idx")
    .on("readingRun")
    .columns(["userId", "updatedAt"])
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("readingRun_userId_updatedAt_idx").execute();

  await db.schema.dropTable("readingRun").execute();
}
