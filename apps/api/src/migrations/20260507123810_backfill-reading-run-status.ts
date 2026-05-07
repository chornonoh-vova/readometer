import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db
    .updateTable("readingRun")
    .set({ status: "completed" })
    .where("finishedAt", "is not", null)
    .where("status", "is", null)
    .execute();

  await db
    .updateTable("readingRun")
    .set({ status: "active" })
    .where("status", "is", null)
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.updateTable("readingRun").set({ status: null }).execute();
}
