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
- **Auth**: Better Auth (email + password) with Cloudflare Turnstile
  captcha plugin; cookies are prefixed `readometer`
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
```

There is deliberately no `build` script; `apps/web` is the only workspace with one.

Formatting is repo-wide, not per-app — run `bun run fmt` from the repo root.

Migrations live in `src/migrations/` and need no registration — kysely-ctl
discovers them by scanning the directory, so `bun run db:migrate make <name>`
is all it takes to add one. Keep schema changes and backfills in separate
files. In production the `migration` service in `compose.yaml` reuses the api
image to run `bun run db:migrate latest` once and exit, which is why
`kysely-ctl` ships in the image rather than being pruned as a dev dependency.

## Environment variables

See `sample.env` for a working development configuration.

| Variable               | Required | Description                                          |
| ---------------------- | -------- | ---------------------------------------------------- |
| `PORT`                 | no       | Defaults to `3000`                                   |
| `NODE_ENV`             | no       | `development` enables verbose route logging          |
| `DATABASE_URL`         | yes      | Postgres connection string                           |
| `BETTER_AUTH_SECRET`   | yes      | Session signing secret                               |
| `BETTER_AUTH_URL`      | yes      | Public URL of the deployment                         |
| `TRUSTED_ORIGINS`      | no       | Comma-separated CORS allowlist (defaults to above)   |
| `TURNSTILE_SECRET_KEY` | yes      | Cloudflare Turnstile secret                          |
| `GOOGLE_CLIENT_ID`     | yes      | Google OAuth client ID                               |
| `GOOGLE_CLIENT_SECRET` | yes      | Google OAuth client secret                           |
| `STORAGE_PATH`         | yes      | Directory for cover images (`sm`/`md` WebP variants) |

## Docker

`Dockerfile` is a multi-stage build: `turbo prune api --docker` produces a
minimal context, the `builder` stage runs `bun turbo build --filter=api`,
and the runner image installs `libvips` for Sharp and exposes port 3000
with a `curl /api/healthz` healthcheck.
