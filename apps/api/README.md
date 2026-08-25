# @readometer/api

The Readometer backend: a [Hono](https://hono.dev) HTTP server running on
[Bun](https://bun.com), with [Kysely](https://kysely.dev) as the
PostgreSQL query builder and [Better Auth](https://better-auth.com) for
session-based authentication.

## Stack

- **Runtime**: Bun
- **HTTP**: Hono (`cors`, `compress`, `logger`, `request-id`)
- **Validation**: Zod via `@hono/zod-validator`
- **Database**: PostgreSQL + Kysely + `kysely-ctl` for migrations
- **Auth**: Better Auth (email + password, plus Google and Apple OAuth)
  with Cloudflare Turnstile captcha plugin; cookies are prefixed
  `readometer`
- **Images**: Sharp — cover uploads are stored as `sm` (200 px) and `md`
  (400 px) WebP variants, plus a dominant-colour hex for placeholders

## Entry points

- `src/index.ts` — top-level entry. Boots the Hono server via `src/app.ts`
  and registers the ordered shutdown hooks (HTTP → queue → Redis → pg pool).
  There is no build step: dev, tests, and the production image all run this
  file directly with `bun src/index.ts`.
- `src/app.ts` — wires middlewares and mounts routes under `/api`.

## Route map

All routes are mounted under `/api`. Everything except `/healthz`,
`/readyz`, and `/auth/*` is gated by the `requireAuth` middleware.

| Route                                   | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `GET  /healthz`                         | Liveness probe                                   |
| `GET  /readyz`                          | Readiness probe — `SELECT 1` against Postgres    |
| `*    /auth/*`                          | Better Auth handler (sign-up, sign-in, sessions) |
| `GET  /me`                              | Current user + session                           |
| `GET/POST/PUT/DELETE /books`            | Book CRUD                                        |
| `POST/DELETE /books/:id/cover`          | Upload or delete a book cover                    |
| `GET  /covers/*`                        | Serves files from `STORAGE_PATH`                 |
| `GET  /reading-activity`                | Aggregated daily reading stats for a given year  |
| `GET/POST/PUT/DELETE /reading-runs`     | Reading runs (a pass through a book)             |
| `GET/POST/PUT/DELETE /reading-sessions` | Individual reading sessions                      |

`reading-sessions` writes are transactional: creating or updating a
session also updates its parent `readingRun.completedPages`, and sets
`finishedAt` when the end page reaches `book.totalPages`.

## Data model

Domain tables (see `src/lib/db.d.ts` for the generated Kysely types):

- `user`, `account`, `session`, `verification` — managed by Better Auth
- `book` — title, description, author, `totalPages`, `publishDate`,
  `isbn13`, `language`, `coverId`, `coverColor`
- `readingRun` — one-to-many from `book`, tracks `completedPages`,
  `startedAt`, `finishedAt`
- `readingSession` — one-to-many from `readingRun`, with
  `startPage`/`endPage`, `readPages`, `readTime`, `startTime`/`endTime`

## Scripts

```sh
bun run dev          # bun --watch src/index.ts
bun run db:migrate   # kysely migrate (via kysely-ctl)
bun run db:generate  # regenerate src/lib/db.d.ts from the live DB
bun run typecheck    # tsc --noEmit
bun run lint         # eslint .
bun run test         # vitest run (needs Docker — testcontainers Postgres)
bun run purge:bots   # dry run; --apply to delete matched bot accounts
bun run sweep:covers # dry run; --apply to delete orphaned cover files
```

There is deliberately no `build` script; `apps/web` is the only workspace with one.

Formatting is repo-wide, not per-app — run `bun run fmt` from the repo root.

Migrations live in `src/migrations/` and need no registration — kysely-ctl
discovers them by scanning the directory, so `bun run db:migrate make <name>`
is all it takes to add one. Keep schema changes and backfills in separate
files. In production the `migration` service in `compose.yaml` reuses the api
image to run `bun run db:migrate latest` once and exit, which is why
`kysely-ctl` ships in the image rather than being pruned as a dev dependency.

## Reclaiming disk after an abuse incident

1. `bun run purge:bots` — dry run; review the matched accounts. It matches on a
   blocklisted email domain or a name past `FIELD_LIMITS.userName`, and
   deliberately _not_ on `emailVerified = false` alone, which would catch real
   people who have not clicked their link yet.
2. `bun run purge:bots -- --apply` — delete them. Every FK to `user.id` is
   `ON DELETE CASCADE`, so books, runs, sessions, goals, sessions and accounts
   follow.
3. `bun run sweep:covers -- --apply` — remove cover files with no owning book.
4. **`DELETE` does not return disk to the OS.** It only marks tuples dead. Run
   `VACUUM (FULL, ANALYZE) "user"` (and `book`, `"readingSession"`,
   `"readingRun"`, `session`, `verification`) — an exclusive lock, so it needs a
   maintenance window and free disk equal to the live data size. `pg_repack`
   does the same online if the extension is available.

Step 4 is the one that gets missed: without it the space stays allocated and the
incident looks unresolved.

## Rate limits and quotas

All `POST`/`PUT`/`PATCH`/`DELETE` routes share a per-user ceiling of 100
requests per hour, returning `429` with `Retry-After`. Separately, each account
is capped at 1,000 books, 5 reading runs per book, 5,000 reading sessions, and
100 sessions per run, returning `403`. Constants live in `src/lib/limits.ts`.

Email/password sign-up is restricted to Gmail and iCloud domains
(`src/lib/accountPolicy.ts`); every other provider goes through Google or
Apple OAuth.

## Environment variables

See `sample.env` for a working development configuration.

### Sign in with Apple

Apple is the one provider with no static client secret. `src/lib/appleAuth.ts`
signs an ES256 JWT from `APPLE_PRIVATE_KEY` and hands it to Better Auth as the
`apple` provider's `clientSecret`. Three things about that are easy to trip on:

- **It is signed once.** Better Auth resolves a function-valued social provider
  when the auth context is built, then caches it for the life of the process, so
  the secret is minted at startup and never refreshed. That is why its TTL is
  180 days (Apple's ceiling is six months) rather than a few minutes.
- **The private key cannot contain literal newlines.** Bun's `.env` reader keeps
  `\n` escaped even inside double quotes, so `importPKCS8` would reject a
  "properly" multi-line value. Keep it on one line with `\n` escapes;
  `normalizeApplePrivateKey` accepts either spelling.
- **Apple will not call back to localhost.** The registered return URL must be
  `<BETTER_AUTH_URL>/api/auth/callback/apple` over https, and Apple rejects
  `http://` and `localhost`. `bun run dev` therefore cannot exercise the Apple
  button; use an https tunnel or a deployed environment.

Apple posts the callback as a `form_post` from its own host, which is why
`https://appleid.apple.com` is appended to `trustedOrigins` in `src/lib/auth.ts` —
without it Better Auth's origin check rejects the callback as CSRF.

| Variable                      | Required | Description                                          |
| ----------------------------- | -------- | ---------------------------------------------------- |
| `PORT`                        | no       | Defaults to `3000`                                   |
| `NODE_ENV`                    | no       | `development` enables verbose route logging          |
| `DATABASE_URL`                | yes      | Postgres connection string                           |
| `BETTER_AUTH_SECRET`          | yes      | Session signing secret                               |
| `BETTER_AUTH_URL`             | yes      | Public URL of the deployment                         |
| `TRUSTED_ORIGINS`             | no       | Comma-separated CORS allowlist (defaults to above)   |
| `TURNSTILE_SECRET_KEY`        | yes      | Cloudflare Turnstile secret                          |
| `GOOGLE_CLIENT_ID`            | yes      | Google OAuth client ID                               |
| `GOOGLE_CLIENT_SECRET`        | yes      | Google OAuth client secret                           |
| `APPLE_CLIENT_ID`             | yes      | Apple **Services ID** — not the App ID               |
| `APPLE_TEAM_ID`               | yes      | Apple team ID (10 chars)                             |
| `APPLE_KEY_ID`                | yes      | Key ID of the "Sign in with Apple" `.p8`             |
| `APPLE_PRIVATE_KEY`           | yes      | The `.p8` PKCS#8 PEM, newlines escaped as `\n`       |
| `APPLE_APP_BUNDLE_IDENTIFIER` | yes      | Native iOS bundle ID — unused by the web flow        |
| `STORAGE_PATH`                | yes      | Directory for cover images (`sm`/`md` WebP variants) |

## Docker

`Dockerfile` is a multi-stage build: `turbo prune api --docker` produces a
minimal context, the `builder` stage runs `bun turbo build --filter=api`,
and the runner image installs `libvips` for Sharp and exposes port 3000
with a `curl /api/healthz` healthcheck.
