/**
 * Deletes everything banned accounts produced, keeping the accounts themselves
 * so the ban and the burned email address survive.
 *
 * Run with `--apply` to actually delete; the default is a dry run.
 *
 * NOTE: DELETE only marks tuples dead. It will NOT shrink the database on disk.
 * Follow up with VACUUM FULL (exclusive lock, needs a maintenance window) or
 * pg_repack (online). See the README section on reclaiming disk.
 */
import { resourceClosers } from "../src/lib/resources.ts";
import { runShutdown } from "../src/lib/shutdown.ts";
import {
  countUserContent,
  listBannedUsers,
  purgeUserContent,
} from "../src/lib/moderation.ts";

// Importing auth pulls in the BullMQ queue, which holds the event loop open
// until it is closed.
const close = () => runShutdown(resourceClosers, 8000);

const apply = process.argv.includes("--apply");

const banned = await listBannedUsers();
const userIds = banned.map((u) => u.id);

console.log(`${banned.length} banned users`);
for (const user of banned) {
  const counts = await countUserContent([user.id]);
  console.log(
    `  ${user.id}  ${user.email}  books=${counts.books} goals=${counts.goals} covers=${counts.covers}`,
  );
}

const total = await countUserContent(userIds);
console.log(
  `\ntotal: ${total.books} books, ${total.goals} goals, ${total.covers} covers`,
);

if (!apply) {
  console.log("dry run - pass --apply to delete");
  await close();
  process.exit(0);
}

const deleted = await purgeUserContent(userIds);
console.log(
  `deleted ${deleted.books} books (runs and sessions cascaded), ${deleted.goals} goals, ${deleted.covers} covers`,
);
console.log("run VACUUM FULL or pg_repack to reclaim the disk");

await close();
