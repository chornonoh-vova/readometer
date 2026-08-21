import { HTTPException } from "hono/http-exception";
import { db } from "./database.ts";
import { QUOTAS } from "./limits.ts";

/**
 * Per-account row ceilings, enforced as a COUNT before each insert.
 *
 * Deliberately not atomic: two concurrent requests can both pass the check and
 * overshoot a ceiling by a row or two. With this much headroom that does not
 * matter, and making it exact would mean a trigger or a constraint - which is
 * out of scope until the polluted tables have been cleaned up.
 *
 * COUNT returns bigint, which the driver hands back as a string, so every
 * result is wrapped in Number() - matching goals.ts and readingActivity.ts.
 */
async function countBooks(userId: string): Promise<number> {
  const row = await db
    .selectFrom("book")
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .where("userId", "=", userId)
    .executeTakeFirst();

  return Number(row?.total ?? 0);
}

export async function assertBookQuota(userId: string): Promise<void> {
  if ((await countBooks(userId)) >= QUOTAS.booksPerUser) {
    throw new HTTPException(403, {
      message: `Book limit reached (${QUOTAS.booksPerUser}). Delete a book before adding another.`,
    });
  }
}

/** Matches readingRun_userId_bookId_idx, so this is an index-only scan. */
async function countRuns(userId: string, bookId: string): Promise<number> {
  const row = await db
    .selectFrom("readingRun")
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .where("userId", "=", userId)
    .where("bookId", "=", bookId)
    .executeTakeFirst();

  return Number(row?.total ?? 0);
}

export async function assertRunQuota(
  userId: string,
  bookId: string,
): Promise<void> {
  if ((await countRuns(userId, bookId)) >= QUOTAS.runsPerBook) {
    throw new HTTPException(403, {
      message: `Reading run limit reached for this book (${QUOTAS.runsPerBook}).`,
    });
  }
}

async function countSessions(userId: string, runId?: string): Promise<number> {
  let query = db
    .selectFrom("readingSession")
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .where("userId", "=", userId);

  if (runId !== undefined) {
    query = query.where("runId", "=", runId);
  }

  const row = await query.executeTakeFirst();
  return Number(row?.total ?? 0);
}

/**
 * Both ceilings, checked independently. The per-user total is the real bound -
 * 1_000 books x 5 runs x 100 sessions is 500_000, far above it - so it must
 * never be derived from the per-run limit. The per-run check exists to catch a
 * runaway client loop early with a specific message.
 */
export async function assertSessionQuota(
  userId: string,
  runId: string,
): Promise<void> {
  const [total, perRun] = await Promise.all([
    countSessions(userId),
    countSessions(userId, runId),
  ]);

  if (total >= QUOTAS.sessionsPerUser) {
    throw new HTTPException(403, {
      message: `Reading session limit reached (${QUOTAS.sessionsPerUser}).`,
    });
  }

  if (perRun >= QUOTAS.sessionsPerRun) {
    throw new HTTPException(403, {
      message: `Reading session limit reached for this run (${QUOTAS.sessionsPerRun}).`,
    });
  }
}
