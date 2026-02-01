import type { Kysely } from "kysely";
import { sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("book")
    .addColumn("id", "uuid", (col) => col.primaryKey().notNull())
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("author", "text")
    .addColumn("totalPages", "integer", (col) =>
      col.notNull().check(sql`"totalPages" > 0`),
    )
    .addColumn("publishDate", "date")
    .addColumn("isbn13", "char(13)")
    .addColumn("language", "char(2)")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex("book_userId_updatedAt_idx")
    .on("book")
    .columns(["userId", "updatedAt"])
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("book_userId_updatedAt_idx").execute();

  await db.schema.dropTable("book").execute();
}
