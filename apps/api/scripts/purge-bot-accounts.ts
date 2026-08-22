/**
 * Deletes accounts matching the bot campaigns and reports what went.
 *
 * Every FK to `user.id` is ON DELETE CASCADE, so `book`, `readingRun`,
 * `readingSession`, `goal`, and `account` rows follow automatically.
 *
 * Run with `--apply` to actually delete; the default is a dry run.
 *
 * The lexical scoring is shared with the signup gate (src/lib/botScore.ts), so
 * anything this deletes would be rejected at the door today. The two signals
 * added here need the whole table and so cannot live on the signup path:
 * Gmail alias collision, and the legacy disposable-domain/oversized-name
 * filters from the first campaign.
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
import {
  BOT_SCORE_THRESHOLD,
  findAliasCollisions,
  scoreSignup,
} from "../src/lib/botScore.ts";

const apply = process.argv.includes("--apply");

const candidates = await db
  .selectFrom("user")
  .select(["id", "email", "name", "emailVerified", "createdAt"])
  .where("banned", "=", false)
  .execute();

const collided = new Set(
  findAliasCollisions(candidates).flatMap((group) => group.map((u) => u.id)),
);

/**
 * Deliberately NOT matching on `emailVerified = false` alone: a real person who
 * signed up and has not clicked the link yet would be caught by that.
 */
const scored = candidates
  .map((user) => {
    const { score, signals } = scoreSignup(user.name, user.email);
    const extra: string[] = [];

    // Alias collision is worth a dot-fragmented local part: on its own it
    // already means one mailbox holding two accounts.
    if (collided.has(user.id)) extra.push("email-alias-collision");

    // The two first-campaign filters were absolute and stay absolute - they
    // rank above anything the lexical score can reach.
    const legacy =
      isDisposableEmailDomain(user.email) || !isNameWithinLimit(user.name);
    if (isDisposableEmailDomain(user.email)) extra.push("email-disposable");
    if (!isNameWithinLimit(user.name)) extra.push("name-over-limit");

    return {
      user,
      score: legacy ? 99 : score + (collided.has(user.id) ? 3 : 0),
      signals: [...signals, ...extra],
    };
  })
  .filter((row) => row.score >= BOT_SCORE_THRESHOLD)
  .sort((a, b) => b.score - a.score);

console.log(`scanned ${candidates.length} users, matched ${scored.length}`);
for (const { user, score, signals } of scored) {
  console.log(
    `  score=${String(score).padStart(3)}  ${user.id}  ${user.email}  ${signals.join(",")}`,
  );
  console.log(
    `        name=${JSON.stringify(user.name)} verified=${user.emailVerified} created=${user.createdAt.toISOString()}`,
  );
}

if (!apply) {
  console.log("\ndry run - pass --apply to delete");
  await db.destroy();
  process.exit(0);
}

if (scored.length > 0) {
  const result = await db
    .deleteFrom("user")
    .where(
      "id",
      "in",
      scored.map((row) => row.user.id),
    )
    .executeTakeFirst();

  console.log(`\ndeleted ${result.numDeletedRows} users (children cascaded)`);
  console.log("run VACUUM FULL or pg_repack to reclaim the disk");
}

await db.destroy();
