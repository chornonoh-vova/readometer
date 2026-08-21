/**
 * Deletes accounts matching the August 2026 bot campaign and reports what went.
 *
 * Every FK to `user.id` is ON DELETE CASCADE, so `book`, `readingRun`,
 * `readingSession`, `goal`, `session`, and `account` rows follow automatically.
 *
 * Run with `--apply` to actually delete; the default is a dry run.
 *
 * NOTE: DELETE only marks tuples dead. It will NOT shrink the database on disk.
 * Follow up with VACUUM FULL (exclusive lock, needs a maintenance window) or
 * pg_repack (online). See the README section on reclaiming disk.
 */
import { db } from "../src/lib/database.ts";
import {
  isDisposableEmailDomain,
  isNameWithinLimit,
} from "../src/lib/accountPolicy.ts";

const apply = process.argv.includes("--apply");

const candidates = await db
  .selectFrom("user")
  .select(["id", "email", "name", "emailVerified", "createdAt"])
  .execute();

/**
 * Deliberately NOT matching on `emailVerified = false` alone: a real person who
 * signed up and has not clicked the link yet would be caught by that. Both
 * criteria below are things only the attack produces.
 */
const doomed = candidates.filter(
  (u) => isDisposableEmailDomain(u.email) || !isNameWithinLimit(u.name),
);

console.log(`scanned ${candidates.length} users, matched ${doomed.length}`);
for (const u of doomed) {
  console.log(
    `  ${u.id}  ${u.email}  nameLen=${u.name.length}  verified=${u.emailVerified}  created=${u.createdAt.toISOString()}`,
  );
}

if (!apply) {
  console.log("\ndry run - pass --apply to delete");
  await db.destroy();
  process.exit(0);
}

if (doomed.length > 0) {
  const result = await db
    .deleteFrom("user")
    .where(
      "id",
      "in",
      doomed.map((u) => u.id),
    )
    .executeTakeFirst();

  console.log(`\ndeleted ${result.numDeletedRows} users (children cascaded)`);
  console.log("run VACUUM FULL or pg_repack to reclaim the disk");
}

await db.destroy();
