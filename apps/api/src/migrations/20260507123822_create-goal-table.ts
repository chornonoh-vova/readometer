import { sql } from "kysely";
import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("goal")
    .addColumn("id", "uuid", (col) => col.primaryKey().notNull())
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("type", "text", (col) =>
      col.notNull().check(sql`"type" IN ('daily','yearly')`),
    )
    .addColumn("metric", "text", (col) =>
      col.notNull().check(sql`"metric" IN ('minutes','pages','books')`),
    )
    .addColumn("target", "integer", (col) =>
      col.notNull().check(sql`"target" > 0`),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex("goal_userId_type_uniq")
    .unique()
    .on("goal")
    .columns(["userId", "type"])
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("goal_userId_type_uniq").execute();
  await db.schema.dropTable("goal").execute();
}
