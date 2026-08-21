/**
 * One-off cleanup for abuse accounts.
 *
 * Reports what it would remove and exits. Nothing is deleted unless --confirm
 * is passed, so a bare invocation is always safe to run against production.
 *
 *   bun run scripts/purge-user.ts <email> [<email>...]
 *   bun run scripts/purge-user.ts <email> [<email>...] --confirm
 *
 * Sessions are revoked before the row is deleted, and that ordering matters:
 * this deployment configures `secondaryStorage` without
 * `session.storeSessionInDatabase`, so sessions live in Redis only. The
 * Postgres `session` table is unused, which means the ON DELETE CASCADE on
 * `user` clears nothing — dropping the row alone would leave a live session in
 * Redis until its TTL expired. `deleteUserSessions` is what actually cuts
 * access.
 *
 * Everything else (book, readingRun, readingSession, goal, account) is
 * `references("user.id").onDelete("cascade")`, so deleting the user row removes
 * it in one statement.
 */
import { auth } from "../src/lib/auth.ts";
import { db, pool } from "../src/lib/database.ts";
import { redisClient } from "../src/lib/redis.ts";
import { closeRedisClient } from "../src/lib/shutdown.ts";
import { connection, notificationsQueue } from "../src/lib/notifications.ts";

type Counts = {
  book: number;
  readingRun: number;
  readingSession: number;
  goal: number;
  account: number;
};

async function countsFor(userId: string): Promise<Counts> {
  const count = (value: unknown) => Number(value ?? 0);

  const [book, readingRun, readingSession, goal, account] = await Promise.all([
    db
      .selectFrom("book")
      .select(({ fn }) => fn.countAll().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("readingRun")
      .select(({ fn }) => fn.countAll().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("readingSession")
      .select(({ fn }) => fn.countAll().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("goal")
      .select(({ fn }) => fn.countAll().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("account")
      .select(({ fn }) => fn.countAll().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirst(),
  ]);

  return {
    book: count(book?.count),
    readingRun: count(readingRun?.count),
    readingSession: count(readingSession?.count),
    goal: count(goal?.count),
    account: count(account?.count),
  };
}

function report(label: string, counts: Counts) {
  console.log(`  ${label}:`);
  for (const [table, total] of Object.entries(counts)) {
    console.log(`    ${table.padEnd(16)} ${total}`);
  }
}

async function purge(email: string, confirm: boolean) {
  const user = await db
    .selectFrom("user")
    .select(["id", "email", "name", "emailVerified", "createdAt"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (!user) {
    console.log(`\n${email}: no such user, skipping`);
    return;
  }

  console.log(`\n${email}`);
  console.log(
    `  id=${user.id} name=${JSON.stringify(user.name)} emailVerified=${user.emailVerified} createdAt=${user.createdAt.toISOString()}`,
  );

  const before = await countsFor(user.id);
  report("owns", before);

  if (!confirm) {
    console.log("  (report only — pass --confirm to delete)");
    return;
  }

  // Redis first: see the note at the top of this file.
  const { internalAdapter } = await auth.$context;
  await internalAdapter.deleteUserSessions(user.id);
  console.log("  revoked sessions (Redis secondary storage)");

  await db.deleteFrom("user").where("id", "=", user.id).execute();
  console.log("  deleted user row");

  const after = await countsFor(user.id);
  report("remaining", after);

  const leftover = Object.entries(after).filter(([, total]) => total > 0);
  if (leftover.length > 0) {
    console.error(
      `  WARNING: rows survived the cascade: ${leftover
        .map(([table, total]) => `${table}=${total}`)
        .join(", ")}`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const emails = args.filter((arg) => !arg.startsWith("--"));

  if (emails.length === 0) {
    console.error(
      "usage: bun run scripts/purge-user.ts <email> [<email>...] [--confirm]",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    confirm
      ? `DELETING ${emails.length} user(s) and everything they own`
      : `Reporting on ${emails.length} user(s) — nothing will be deleted`,
  );

  for (const email of emails) {
    await purge(email, confirm);
  }
}

try {
  await main();
} finally {
  await notificationsQueue.close();
  await closeRedisClient(connection);
  await closeRedisClient(redisClient);
  await db.destroy();
  await pool.end().catch(() => {
    // Kysely's destroy already ends the shared pool
  });
}
