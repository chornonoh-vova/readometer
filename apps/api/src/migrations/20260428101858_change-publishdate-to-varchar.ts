import type { Kysely } from "kysely";
import { sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("book")
    .alterColumn("publishDate", (col) =>
      col.setDataType(
        sql`varchar(10) USING TO_CHAR("publishDate", 'YYYY-MM-DD')`,
      ),
    )
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("book")
    .alterColumn("publishDate", (col) =>
      col.setDataType(sql`date USING TO_DATE("publishDate", 'YYYY-MM-DD')`),
    )
    .execute();
}
