# CLAUDE.md

Readometer is a reading tracker and activity visualizer — a Turborepo monorepo of
`apps/*` and `packages/*`. Per-app guidance lives in each app's own `CLAUDE.md`.

**Package manager**: Bun (required — do not use npm/yarn/pnpm)

## Commands

The standard turbo tasks (`build`, `dev`, `lint`, `typecheck`, `test`, `fmt`) are in the
root `package.json`; run one workspace with `bun turbo run <task> --filter=<workspace>`.
The non-obvious ones:

```bash
cd apps/api && bun run db:migrate              # run pending migrations
cd apps/api && bun run db:migrate make <name>  # scaffold a migration file — kysely-ctl
                                               # discovers migrations by scanning
                                               # src/migrations/, so there is no
                                               # registration step
cd apps/api && bun run db:generate             # regenerate src/lib/db.d.ts from the schema
```

## Local Development

Two supported flows:

- **Native (fastest iteration)** — deps in Docker, app code native. `bun run dev` needs
  the deps already running:
  ```bash
  bun run dev:deps:up   # Postgres + Dragonfly + Mailpit only
  bun run dev           # api, web, and notifications dev servers
  bun run dev:deps:down
  ```
  (`bun run dev:local` does all three in sequence.)
- **Fully containerized** — `bun run dev:docker` builds and runs everything, Traefik
  included, and tears down on exit.

Auth uses cookie-based sessions. Mailpit's web UI (`http://localhost:8025`, either flow)
shows any email the `notifications` service sends in dev.

## Shared packages (`packages/isbn`, `packages/notification-events`)

Both are flat single-`src/index.ts` libraries with **no build step** — api, web, and
notifications all run under Bun/Vite directly from source. `packages/notification-events`
payloads cross a process boundary via Redis serialization, so its schema is `.parse()`d on
both enqueue and dequeue.

## Environment Variables

Each app has a committed `sample.env` listing its variables — copy it to `.env`. What the
samples don't tell you:

- **SMTP** (`apps/notifications`): locally `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, with
  `SMTP_USER`/`SMTP_PASS` unset. In production it's Resend's relay — `smtp.resend.com`,
  port `587`, user `resend`, password = the Resend API key. `SMTP_SECURE=false` in both.
- `REDIS_URL` must be the same value in `apps/api` and `apps/notifications` — they share
  the notification queue.
