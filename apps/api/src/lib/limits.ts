/** Maximum accepted length of each user-supplied field. */
export const FIELD_LIMITS = {
  bookTitle: 256,
  bookDescription: 1_000,
  bookAuthor: 128,
  userName: 128,
  /** Truncated, not rejected: a long UA is not worth failing a login over. */
  userAgent: 512,
  tz: 64,
  /** Longest books in print are ~13k pages; 50k is unreachable slack. */
  pages: 50_000,
  /** Seconds. `/goals/progress` divides this by 60. */
  readTimeSeconds: 86_400,
  goalDailyMinutes: 1_440,
  goalDailyPages: 10_000,
  goalYearlyBooks: 1_000,
} as const;

/**
 * Per-account row ceilings. Nested quotas multiply, so `sessionsPerUser` is
 * the only real bound: 1_000 books x 5 runs x 100 sessions = 500_000, two
 * orders of magnitude above it. `sessionsPerRun` exists to catch a runaway
 * client loop early with a clear error, and must never be used to derive the
 * per-user total.
 */
export const QUOTAS = {
  booksPerUser: 1_000,
  runsPerBook: 5,
  sessionsPerUser: 5_000,
  sessionsPerRun: 100,
} as const;

/**
 * Request body ceilings by route tier. `auth` is tightest because better-auth
 * owns that handler and we cannot add Zod caps inside it.
 */
export const BODY_LIMITS = {
  auth: 16 * 1024,
  json: 64 * 1024,
  upload: 1024 * 1024,
} as const;

/**
 * Velocity ceiling per user, distinct from QUOTAS (which bound totals).
 *
 * A bot held to this still cannot exceed its QUOTAS, so this exists to stop
 * CPU and connection burn rather than data volume - which is why it can afford
 * to be generous. Adding one book with a cover and logging three sessions is
 * 6 writes.
 */
export const RATE_LIMITS = {
  writesPerWindow: 100,
  windowSeconds: 60 * 60,
} as const;
