import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Not a better-auth `additionalFields`: that would leak it to every client
  // through /api/me and /api/auth/get-session.
  await db.schema
    .alterTable("user")
    .addColumn("banned", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("user").dropColumn("banned").execute();
}
