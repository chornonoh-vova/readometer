/**
 * Bans accounts by email or id and kills their live sessions.
 *
 * Run with `--apply` to actually ban; the default is a dry run.
 *
 * Banning does not remove anything the account produced - run
 * `bun run purge:banned` for that.
 */
import { resourceClosers } from "../src/lib/resources.ts";
import { runShutdown } from "../src/lib/shutdown.ts";
import { banUsers, findUsers } from "../src/lib/moderation.ts";

const apply = process.argv.includes("--apply");
const identifiers = process.argv.slice(2).filter((arg) => arg !== "--apply");

// Importing auth pulls in the BullMQ queue, which holds the event loop open
// until it is closed.
const close = () => runShutdown(resourceClosers, 8000);

if (identifiers.length === 0) {
  console.error("usage: bun run ban:user <email-or-id>... [--apply]");
  await close();
  process.exit(1);
}

const matched = await findUsers(identifiers);
const matchedKeys = new Set(matched.flatMap((u) => [u.id, u.email]));
const unmatched = identifiers.filter((id) => !matchedKeys.has(id));

console.log(`matched ${matched.length} of ${identifiers.length} identifiers`);
for (const user of matched) {
  const state = user.banned ? "already banned" : "to ban";
  console.log(`  ${user.id}  ${user.email}  ${state}`);
}
for (const identifier of unmatched) {
  console.log(`  no such user: ${identifier}`);
}

if (!apply) {
  console.log("\ndry run - pass --apply to ban");
  await close();
  process.exit(0);
}

if (matched.length > 0) {
  await banUsers(matched.map((u) => u.id));
  console.log(`\nbanned ${matched.length} users, sessions revoked`);
}

await close();
