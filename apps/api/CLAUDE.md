# apps/api

Hono REST API on Bun with PostgreSQL, Kysely, and Better Auth.

- Middleware chain: cors → compress → request-id → logger → routes. All authenticated
  routes check the session middleware.
- `src/lib/db.d.ts` is **auto-generated** by `bun run db:generate` — never hand-edit it.
- Reading runs carry a lifecycle `status` of `'active' | 'completed' | 'abandoned'`.
  `finishedAt` is set when a run leaves `'active'`; `status` is set/reset by
  `readingSessions` when the run reaches/leaves `totalPages`, and explicitly via
  `PUT /api/reading-runs/:id`.
- `/api/goals` stores per-user daily and yearly targets (one row per `(userId, type)`).
  Progress is **derived** on read by `GET /api/goals/progress?date&tz` from
  `readingSession` (daily minutes/pages) and `readingRun` (yearly completed books) — never
  stored. Both `/api/goals/progress` and `/api/reading-activity` accept an IANA `tz` query
  param and compute calendar-day boundaries with Postgres `AT TIME ZONE`.
- Tests spin up a real PostgreSQL container per run via testcontainers, so Docker must be
  running before `bun run test`.
