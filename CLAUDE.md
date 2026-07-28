# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Readometer is a reading tracker and activity visualizer. It's a Turborepo monorepo with:
- `apps/api` — Hono REST API running on Bun with PostgreSQL
- `apps/web` — React 19 + Vite SPA/PWA
- `apps/notifications` — BullMQ worker that renders React Email templates and sends them over SMTP
- `packages/isbn` — shared ISBN validation library
- `packages/notification-events` — shared Zod event contracts for the notification queue

**Package manager**: Bun (required — do not use npm/yarn/pnpm)

## Commands

### Root (run from repo root)

```bash
bun run build       # build all workspaces
bun run dev         # start all dev servers concurrently (needs deps running — see Local Development)
bun run dev:local   # spin up deps.compose.yaml, run `bun run dev` natively, tear down on exit
bun run dev:docker  # build + run the full dev.compose.yaml stack (everything containerized)
bun run lint        # lint all workspaces
bun run typecheck   # typecheck all workspaces
bun run test        # test all workspaces
bun run fmt         # format all workspaces
```

### Per-workspace (use `--filter` or cd into the workspace)

```bash
# Run a single workspace
bun turbo run test --filter=api
bun turbo run test --filter=web
bun turbo run test --filter=notifications

# Or from within the workspace directory
cd apps/api && bun run test
cd apps/web && bun run test
cd apps/notifications && bun run test

# API-specific
cd apps/api && bun run db:migrate              # run pending migrations
cd apps/api && bun run db:migrate make <name>  # scaffold a new migration file (does not edit migrations/index.ts — register the new file there manually)
cd apps/api && bun run db:generate             # regenerate src/lib/db.d.ts from schema

# Web-specific
cd apps/web && bun run dev           # dev server at localhost:5173
cd apps/api && bun run dev           # API server at localhost:3000 (needed for web)
```

### Running a single test file

```bash
cd apps/api && bun run test src/routes/books.spec.ts
cd apps/web && bun run test src/components/book-item.spec.tsx
```

## Local Development

Two supported flows:

- **Native (fastest iteration)** — `deps.compose.yaml` runs only Postgres, Dragonfly, and Mailpit; app code runs natively via Bun:
  ```bash
  bun run dev:deps:up   # Postgres + Dragonfly + Mailpit only
  bun run dev           # api, web, and notifications dev servers
  bun run dev:deps:down
  ```
  (`bun run dev:local` does all three in sequence.)
- **Fully containerized** — `dev.compose.yaml` runs everything, including Traefik and `notifications`, built from each app's Dockerfile:
  ```bash
  bun run dev:docker    # build + up; tears down on exit
  ```

Web proxies `/api` → `http://localhost:3000` via Vite config. Auth uses cookie-based sessions. Mailpit's web UI (`http://localhost:8025` in either flow) shows any email sent by the `notifications` service in dev.

## Architecture

### API (`apps/api`)

- **Hono** for routing with a middleware chain: cors → compress → request-id → logger → routes
- **Kysely** for type-safe SQL queries against PostgreSQL; types in `src/lib/db.d.ts` are auto-generated
- **Better Auth** handles email+password auth, Cloudflare Turnstile CAPTCHA, and session cookies
- **Sharp** processes cover images into WebP at 200px and 400px widths, and extracts dominant color
- Route modules live in `src/routes/`; all authenticated routes check session middleware
- Reading runs carry a lifecycle `status` of `'active' | 'completed' | 'abandoned'`. `finishedAt` is set when a run leaves `'active'`; `status` is set/reset by `readingSessions` when the run reaches/leaves `totalPages`, and explicitly via `PUT /api/reading-runs/:id`.
- `/api/goals` stores per-user daily and yearly targets (one row per `(userId, type)`). Progress is **derived** on read by `GET /api/goals/progress?date&tz` from `readingSession` (daily minutes/pages) and `readingRun` (yearly completed books) — never stored. Both `/api/goals/progress` and `/api/reading-activity` accept an IANA `tz` query param and compute calendar-day boundaries with Postgres `AT TIME ZONE`.

**Testing**: Vitest + testcontainers spins up a real PostgreSQL 16 container per test run. Coverage thresholds: lines/statements 85%, functions 80%, branches 70%.

### Web (`apps/web`)

- **TanStack Router** with file-based routing under `src/routes/`. The `_auth/` group guards all app routes; `_auth/_app.tsx` is the app shell with sidebar and reading session overlay.
- **TanStack Query** for server state. Query keys are centralized in `src/lib/query-keys.ts`. Per-resource hooks in `src/lib/` (e.g., `books.ts`, `reading-sessions.ts`) handle fetching and mutations — mutations invalidate relevant query keys.
- **TanStack Form + Zod** for all form handling and client-side validation.
- **Zustand** (`src/store/reading-session.ts`) persists the active reading session to `localStorage`.
- **shadcn/ui + Base UI + Tailwind CSS v4** for UI components.

**Testing**: Vitest + jsdom + React Testing Library. Test files are co-located as `.spec.tsx`.

### Notification service (`apps/notifications`)

Decoupled producer/consumer over a BullMQ queue backed by Dragonfly (Redis-compatible; also used for Better Auth's session cache). `apps/api` owns all business logic and DB access — `publishNotification` (`apps/api/src/lib/notifications.ts`) enqueues fully-resolved events, wired into Better Auth's `sendVerificationEmail`/`sendResetPassword` hooks in `apps/api/src/lib/auth.ts`. `apps/notifications` is stateless: it has no DB access, only a BullMQ `Worker` (`src/worker.ts`) that renders a React Email template per event type (`src/templates/`, `src/handlers/`) and sends it over SMTP via `nodemailer` (`src/lib/mailer.ts`) — Mailpit locally, Resend's SMTP relay in production, so the same code path runs in both. Adding a delivery channel (e.g. push) means adding a new key under an event's `channels` object and a new sender module, without touching existing events.

**Testing**: Vitest + `@testcontainers/redis` spins up a real Redis container per test run (the notification queue's own tests, not to be confused with `apps/api`'s Postgres container); one test also spins up a Mailpit container to verify SMTP delivery end-to-end. Coverage thresholds: lines/statements 85%, functions 80%, branches 70%.

### Shared packages (`packages/isbn`, `packages/notification-events`)

Both are flat TypeScript libraries (single `src/index.ts`, no build step needed since API/web/notifications all run under Bun/Vite directly from source):
- `packages/isbn` — exports `isbnSchema` (Zod) and `normalizeIsbnToIsbn13`. Used by both the API and web.
- `packages/notification-events` — exports the discriminated-union Zod schema (`notificationEventSchema`) and `NOTIFICATIONS_QUEUE_NAME` shared by `apps/api` (producer) and `apps/notifications` (consumer). Validated with `.parse()` on both enqueue and dequeue, since payloads cross a process boundary via Redis serialization.

Plain schema/unit tests, no infra required.

## Environment Variables

**API** (`.env` in `apps/api`):
```
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:5173
TURNSTILE_SECRET_KEY=<key>
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
STORAGE_PATH=storage
PORT=3000
REDIS_URL=redis://user:password@host:6379/0
```

**Notifications** (`.env` in `apps/notifications`):
```
REDIS_URL=<same value as apps/api>
SMTP_HOST=<mailpit|smtp.resend.com>
SMTP_PORT=<1025|587>
SMTP_SECURE=<false>
SMTP_USER=<unset locally|resend>
SMTP_PASS=<unset locally|your Resend API key>
MAIL_FROM=noreply@readometer.local
PORT=3001
```

**Web** (`.env` in `apps/web`):
```
VITE_TURNSTILE_SITE_KEY=<public-site-key>
```
