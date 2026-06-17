import { sql, type Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("readingRun").dropColumn("status").execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("readingRun")
    .addColumn("status", "text", (col) =>
      col
        .check(sql`"status" IN ('active','completed','abandoned')`)
        .notNull()
        .defaultTo("active"),
    )
    .execute();
}
