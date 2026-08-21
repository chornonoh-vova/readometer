# Write-path hardening against automated abuse

**Date:** 2026-08-21
**Status:** Approved for planning

## Problem

An ongoing bot campaign is registering accounts on readometer.app. Turnstile
(`captcha` plugin) and `requireEmailVerification: true` are both in place and both
are being satisfied — `sifafo9462@kolsea.com` registered _and_ verified, using a
disposable-inbox provider. Email verification proves reachability, not humanity;
it was never going to be a bot filter.

The material damage is that the Postgres instance grew by ~30GB in minutes.

## Findings

### What is already safe

Most fields cannot be byte vectors, because the DB bounds them:

- `totalPages`, `readPages`, `startPage`, `endPage`, `readTime`, `goal.target` are
  `integer` (4 bytes) with CHECK constraints.
- `book.isbn13` is `char(13)`; `book.language` is `char(2)`.
- `goal` is capped at **2 rows per user** by the unique index
  `goal_userId_type_uniq`, and `POST /goals` upserts on `(userId, type)`. No goal
  quota is needed.

### What is unbounded

Every remaining vector is an unbounded `text` column fed by attacker-controlled input:

| Column              | Written by                                | Auth required |
| ------------------- | ----------------------------------------- | ------------- |
| `user.name`         | `POST /api/auth/sign-up/email`            | **no**        |
| `session.userAgent` | any sign-in, from the `User-Agent` header | no            |
| `book.title`        | `POST`/`PATCH /api/books`                 | yes           |
| `book.description`  | `POST`/`PATCH /api/books`                 | yes           |
| `book.author`       | `POST`/`PATCH /api/books`                 | yes           |

Compounding these: **no body-size limit exists anywhere in the repo.** `bodyLimit`
appears in no source file, and there is no Traefik or proxy-level cap. Every POST
accepts an arbitrarily large body.

### The primary vector

`user.name` is `text NOT NULL`. `registerFormSchema` (`apps/web/src/components/register-form.tsx:33`)
declares `name: z.string().nonempty()` with no `.max()`, and `apps/api/src/lib/auth.ts`
configures no field validation. With `requireEmailVerification: true`, better-auth
still writes the `user` row _at sign-up_, before verification.

A single unauthenticated `POST /api/auth/sign-up/email` carrying a 100MB `name`
therefore writes 100MB to Postgres — no session, no verified email, no app route
touched.

This is the vector that best explains the observed symptom: 30GB in minutes,
correlated with bot signups, arriving faster than a verify-then-login-then-POST
flow could manage.

**It also means per-user quotas alone would not have prevented this**, because
quotas live on `/books` and `/reading-sessions` and this request never reaches them.
Client-side Zod is irrelevant — the bot posts directly to the API.

## Design

Five layers. Layers 1-3 bound bytes per request; layer 4 bounds rows per account; layer 5 bounds writes per hour.

### Layer 1 — Tiered request body limits

New `apps/api/src/middlewares/bodyLimit.ts`, registered once in `app.ts` before all
routes (including the `/auth/*` handler, which is currently mounted ahead of
`requireAuth()`).

| Path                            | Limit | Rationale                                             |
| ------------------------------- | ----- | ----------------------------------------------------- |
| `/api/auth/*`                   | 16 KB | better-auth owns the handler; we cannot add Zod there |
| `POST /api/books/:bookId/cover` | 8 MB  | phone photos of covers are large                      |
| everything else                 | 64 KB | JSON payloads are small                               |

A single path-aware middleware selects the tier, rather than three overlapping
`app.use()` registrations. Overlapping registrations are the trap here: Hono runs
_all_ matching middleware in order, so a wildcard 64KB limit registered alongside
an 8MB cover limit would reject cover uploads. One middleware, one decision, one
place to test.

Exceeding a limit returns **413**.

### Layer 2 — String and numeric caps in Zod

`apps/api/src/routes/books.ts` (`createBookSchema` and `updateBookSchema` — both;
the update path can rewrite the same row repeatedly, and every rewrite is a new row
version plus WAL):

| Field         | Cap                  |
| ------------- | -------------------- |
| `title`       | `.max(256)`          |
| `description` | `.max(1_000)`        |
| `author`      | `.max(128)`          |
| `language`    | `.length(2)`         |
| `totalPages`  | `.int().max(50_000)` |

`language` already fails at `char(2)`, and `totalPages` already overflows `integer`
— but both currently surface as a Postgres 500 rather than a 400. These caps are
about correct status codes, not storage.

`readingSessions.ts` (create and update schemas):

| Field                  | Cap                                                             |
| ---------------------- | --------------------------------------------------------------- |
| `startPage`, `endPage` | `.int().max(50_000)`                                            |
| `readTime`             | `.int().max(86_400)` — seconds; `/goals/progress` divides by 60 |

`readingRuns.ts`: `completedPages` → `.int().max(50_000)`.

`goals.ts`: `target` per branch of the discriminated union — daily/minutes ≤ 1_440,
daily/pages ≤ 10_000, yearly/books ≤ 1_000. Also `tz` → `.max(64)` in both
`progressSchema` and `readingActivitySchema` before it reaches `canonicalizeTz`.

**Tradeoff accepted:** publisher blurbs commonly run 1,500–2,500 characters, so
`description: 1_000` will reject some legitimate descriptions. Chosen deliberately;
it is a single constant to raise.

### Layer 3 — Auth-path caps

In `apps/api/src/lib/auth.ts`, via `databaseHooks`:

- `user.create.before` — reject `name` longer than 128 chars, and reject email
  domains on a disposable-provider blocklist. Rejection, not truncation, so the
  client gets a clear error.
- `session.create.before` — truncate `userAgent` to 512 chars. Truncation here
  rather than rejection, because a long UA is not a client error worth failing a
  login over.

The disposable-domain blocklist is **defense in depth, explicitly not the fix.**
Bots rotate domains, and an adversary already paying for Turnstile solves will
rotate around a list. It is worth having because it is cheap and it stops the
current wave; it is not worth trusting.

**Rejected: allowlisting `gmail.com`/`icloud.com`.** It permanently turns away
every Proton, Outlook, Fastmail, and custom-domain user while a single throwaway
Gmail defeats it. **Rejected: disabling email signup.** One throwaway Google
account defeats Google-only signup. Both operate on _who gets an account_; the
damage needs exactly one account.

Exact `databaseHooks` signatures must be verified against the installed
better-auth (`^1.6.9`) during implementation.

### Layer 4 — Per-user quotas

| Quota                     | Value | Observed usage | Headroom |
| ------------------------- | ----- | -------------- | -------- |
| Books per user            | 1_000 | ~15 / 6mo      | ~30 yrs  |
| Reading runs per book     | 5     | ~1             | 5x       |
| Reading sessions per user | 5_000 | ~250 / 6mo     | ~10 yrs  |
| Reading sessions per run  | 100   | ~20            | 5x       |

Constants live in one module (`apps/api/src/lib/quota.ts`) with a shared assertion
helper. Enforcement is a `COUNT` before each insert, in the route — chosen over
Dragonfly counters (which drift from reality on deletes and need reconciliation)
and over Postgres triggers (logic in SQL, harder to test). The counts are indexed
and the write volume is tiny.

**Nested quotas multiply, so the per-user total is the only real ceiling.**
1_000 books x 5 runs x 100 sessions = 500,000 — two orders of magnitude above
the 5_000 per-user cap. The per-run limit of 100 exists to catch a runaway client
loop early with a clear error; it is not the bound. The per-user total must
therefore be enforced independently, never derived from the per-run limit.

**Accepted imprecision:** count-then-insert is not atomic, so concurrent requests
can overshoot a quota by a few rows. With this much headroom that does not matter.
Making it exact would require a constraint or trigger, which is deliberately not
being done.

Quota rejection returns **403** with a message (`app.onError` already serialises
`{ message }`, and `register-form.tsx` surfaces `ctx.error.message`).

Note that at the observed ~20 sessions/book ratio, 5_000 sessions is ~250 books —
so for a realistic usage pattern the session cap binds well before the 1_000-book
cap.

### Layer 5 — Per-user write rate limiting

Quotas bound how much an account can ever store; this bounds how fast.
**100 writes per hour per user**, counted in Dragonfly, applied to `POST`, `PUT`,
`PATCH`, and `DELETE`. A fixed window whose index is part of the Redis key, so
the counter expires on its own and the check stays one round trip without
depending on `EXPIRE NX` (Redis 7+, not guaranteed on Dragonfly).

Applied after `requireAuth()`, so it is keyed on `userId` and leaves `/auth/*`
to better-auth's own `rateLimit`.

**Sizing.** Adding one book with a cover and logging three sessions is 6 writes
(`POST /books`, `POST /books/:id/cover`, `POST /reading-runs`, 3x
`POST /reading-sessions`), so 100/hour accommodates a real evening of use,
including logging a weekend backlog. **10/hour was considered and rejected**: it
would block a user partway through adding a second book, and session logging is
bursty by nature.

Because a bot held to this rate still cannot exceed its QUOTAS, the limiter's job
is CPU and connection burn, not data volume — which is exactly why it can afford
to be generous. At 100/hour a bot manages 2,400 writes/day, so maxing the
5_000-session quota on one account takes roughly two days of sustained hammering.

**Fails open.** If Dragonfly is unreachable the write proceeds, with the error
logged. The quotas still bound total damage, so a cache outage should not take
writes down with it.

### Cover upload hardening

`apps/api/src/routes/bookCovers.ts`:

- Reject `file.type` outside `image/jpeg`, `image/png`, `image/webp`, `image/avif`,
  `image/gif` → 400.
- Re-check `file.size` after `parseBody()` as a backstop to layer 1.
- Cap decoded pixel dimensions to guard against decompression bombs — a few-KB
  crafted PNG can expand to gigabytes inside the decoder, and the current code
  hands the same file to `Bun.Image` **three times** (`extractAverageColor` plus
  two `resizeToWebP` calls). Whether dimensions are readable before full decode
  needs verifying against the Bun version in use; if not, file size is the only
  available guard and that limitation should be recorded in a comment.

**Separate pre-existing bug found in this file:** lines 37-38 `unlink` the previous
cover's two WebP files with no error handling. If either file is already missing,
replacing a cover throws ENOENT and 500s. Fix while in the file.

### Cleanup

1. Identify bot accounts: `emailVerified = false`, or a blocklisted email domain,
   or an over-long `name`.
2. Delete them. All FKs to `user.id` are `onDelete("cascade")`, so `book`,
   `readingRun`, `readingSession`, `goal`, `session`, and `account` rows follow.
3. **`DELETE` alone will not shrink the 30GB** — it only marks tuples dead. A
   `VACUUM FULL` (exclusive lock, needs a maintenance window) or `pg_repack`
   (online) is required to return the disk.
4. **Orphaned cover files:** cascade deletes `book` rows but nothing removes the
   WebP files under `STORAGE_PATH`. A sweep comparing `covers/` against
   `book.coverId` is needed, or the disk stays occupied. This is a standing gap,
   not only a cleanup step — `DELETE /api/books/:bookId` presumably leaks the same
   way and should be checked.

A purge script was removed in `34f6d33`; this needs a replacement.

## Error handling

| Condition                                  | Status                      |
| ------------------------------------------ | --------------------------- |
| Body over tier limit                       | 413                         |
| String/number cap exceeded                 | 400 (existing `zValidator`) |
| Bad cover MIME type                        | 400                         |
| Quota exceeded                             | 403                         |
| Blocklisted signup domain / over-long name | 400 from better-auth        |

## Testing

Per `apps/api/test/README.md`: Vitest, Testcontainers Postgres 18.1, specs beside
the source as `src/routes/<name>.spec.ts`, arrange via `test/helpers/factories.ts`,
act via `test/helpers/request.ts` `call()`. Never import `src/` at the top level
outside the helpers — `globalSetup` must set module-level env first.

- `bodyLimit`: oversized body → 413, on each of the three tiers.
- Caps: over-long `title`/`description`/`author` → 400, on both create and update.
- Quotas: seed to the limit via factories, assert the next write is 403 and the one
  before it succeeds. Cover all four quotas, including that per-user sessions binds
  independently of per-run.
- Cover upload: disallowed MIME → 400; oversized → 413; replacing a cover whose
  files are already missing → succeeds, not 500.
- Auth: over-long `name` → rejected; blocklisted domain → rejected.
- Rate limit: reads never consume budget; the write past the ceiling returns 429
  with `Retry-After`; budget is keyed per user. Requires resetting the Redis mock
  between tests, or counters leak across the suite.

## Out of scope

- **DB-level `varchar(n)` and CHECK constraints.** The strongest guarantee, since it
  holds regardless of which code path writes, but it needs a migration over the
  currently-polluted tables — so it must follow cleanup. Per CLAUDE.md, DDL and
  backfill must be separate migration files scaffolded with
  `bun run db:migrate make <name>`.
- **Monitoring.** Nothing alerts on database growth today, which is why 30GB was
  discovered by its effects. An alert would have caught this in minutes.
- **Expired `verification` row cleanup**, not configured in `auth.ts`; every signup
  leaves a permanent row.
