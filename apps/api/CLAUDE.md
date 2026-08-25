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
- **Migrations**: scaffold with `bun run db:migrate make <name>` — kysely-ctl discovers files
  by scanning `src/migrations/`, so nothing needs registering. Keep DDL and data in separate
  files: the `add-…-column` / `backfill-…-column` / `finalize-…-column` (or `drop-…`) triples
  in `src/migrations/` are the pattern to follow, so a schema change and its backfill can fail
  and be retried independently.
- **Sign in with Apple** (`src/lib/appleAuth.ts`): Apple has no static client secret, so
  the `apple` entry in `socialProviders` is a function that signs an ES256 JWT. Better Auth
  resolves that function **once**, when the auth context is built, and caches it for the
  life of the process — it is not a per-request refresh hook, which is why the TTL is 180
  days. `APPLE_PRIVATE_KEY` arrives with `\n`-escaped newlines because nothing in the
  deploy path carries a literal one (Bun's `.env` reader included), hence
  `normalizeApplePrivateKey`. `https://appleid.apple.com` is in `trustedOrigins` because
  Apple `form_post`s the callback from its own host. Apple refuses `localhost` return URLs,
  so this flow cannot be exercised under `bun run dev`.
- `test/globalSetup.ts` generates a throwaway ES256 key per run: `auth.ts` signs a real
  client secret at import time, so a placeholder string fails `importPKCS8` and takes the
  entire suite down with it, not just the auth specs.
- Prefer Kysely's typed query builders over raw SQL; reach for `` sql`…` `` only where no
  builder exists for the construct (e.g. `AT TIME ZONE`, check constraints).
