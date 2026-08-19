# Readometer

Readometer is a reading tracker. It lets you catalogue your
books, log reading runs and sessions, and visualise your daily reading
activity as a yearly heatmap.

The project is a [Turborepo](https://turborepo.com) monorepo managed with
[Bun](https://bun.com) workspaces.

## Repository layout

```
readometer/
├── apps/
│   ├── api/                    # Hono + Bun REST API
│   ├── notifications/          # BullMQ worker: React Email templates over SMTP
│   └── web/                    # React + Vite PWA frontend
├── packages/
│   ├── eslint-config/          # Shared flat ESLint presets: base / node / react
│   ├── isbn/                   # Shared ISBN-10/13 validator and normalizer
│   ├── notification-events/    # Zod schemas for the api → notifications queue payloads
│   └── typescript-config/      # Shared tsconfig presets: base.json / react.json
├── docs/agents/                # Agent-facing conventions (issue tracker, triage, domain)
├── compose.yaml                # Production compose stack (published GHCR images)
├── dev.compose.yaml            # Fully containerized local stack, Traefik included
└── deps.compose.yaml           # Dependencies only: Postgres + Dragonfly + Mailpit
```

Every workspace is `private` and consumed via `workspace:*`; nothing is published to
npm. Each one has its own `README.md` with the detail this page omits:

- [`apps/api`](apps/api/README.md) · [`apps/notifications`](apps/notifications/README.md) ·
  [`apps/web`](apps/web/README.md)
- [`packages/isbn`](packages/isbn/README.md) ·
  [`packages/notification-events`](packages/notification-events/README.md) ·
  [`packages/eslint-config`](packages/eslint-config/README.md) ·
  [`packages/typescript-config`](packages/typescript-config/README.md)

`CLAUDE.md` at the root covers the monorepo-wide conventions, and each app has its
own `CLAUDE.md` for app-specific guidance.

## Stack

- **Runtime & tooling**: Bun, Turborepo, TypeScript
- **API**: [Hono](https://hono.dev), [Kysely](https://kysely.dev),
  [Better Auth](https://better-auth.com) with Cloudflare Turnstile captcha,
  [Sharp](https://sharp.pixelplumbing.com) for cover images, PostgreSQL
- **Notifications**: [BullMQ](https://docs.bullmq.io) worker on Dragonfly,
  [React Email](https://react.email) templates, `nodemailer` over plain SMTP
- **Web**: React 19, Vite, Tailwind CSS v4, shadcn/ui, TanStack Router,
  TanStack Query, TanStack Form, Zustand, `vite-plugin-pwa`
- **Deployment**: Docker images published to GHCR
  (`ghcr.io/chornonoh-vova/readometer-api`,
  `ghcr.io/chornonoh-vova/readometer-notifications`,
  `ghcr.io/chornonoh-vova/readometer-web`)

The two shared libraries have **no build step** — api, web, and notifications all run
directly from their `src/index.ts` under Bun/Vite. `packages/notification-events` is the
contract between api and notifications: because the payloads cross a process boundary
through Redis, its schema is `.parse()`d on both enqueue and dequeue.

## Prerequisites

- [Bun](https://bun.com) 1.3.14 (pinned via `packageManager`)
- Node.js ≥ 24 (declared in `engines`, for tools that need it)
- Docker — required for the dependency stack, and for the api/notifications
  tests, which spin up real Postgres/Redis containers via testcontainers
- A Cloudflare Turnstile site key/secret — the `sample.env` files include
  dummy test keys that always pass.

## Getting started

```sh
# Install workspace dependencies (also installs husky hooks)
bun install

# Copy environment samples
cp sample.env .env
cp apps/api/sample.env apps/api/.env
cp apps/notifications/sample.env apps/notifications/.env
cp apps/web/sample.env apps/web/.env

# Start Postgres, Dragonfly, and Mailpit
bun run dev:deps:up

# Run database migrations
bun --cwd apps/api run db:migrate

# Start every app in watch mode
bun run dev
```

The web app is served on <http://localhost:5173> and the API on
<http://localhost:3000>. Vite proxies `/api` to the API server, so no CORS
setup is needed in development. Mailpit's web UI on <http://localhost:8025> catches
every email the notifications worker sends, and `email dev` serves a live template
preview on <http://localhost:3002>.

Two local flows are supported:

```sh
bun run dev:local    # deps up → dev → deps down, in sequence (native app code)
bun run dev:docker   # build, run, and tear down the whole stack in containers
bun run dev:deps:down
```

## Turborepo tasks

All tasks are wired through `turbo.json` and run across the whole workspace.

```sh
bun run dev         # turbo run dev     — start all apps in watch mode
bun run build       # turbo run build   — build every package/app
bun run typecheck   # turbo run typecheck
bun run lint        # turbo run lint
bun run test        # turbo run test
```

Formatting is not a turbo task — Prettier is configured once at the repo root and
runs over every workspace in a single pass:

```sh
bun run fmt         # prettier . --write
bun run fmt:check   # prettier . --check
```

Filter to a single workspace with `--filter` (workspace names are the bare directory
names: `api`, `notifications`, `web`, `isbn`, `notification-events`, `eslint-config`):

```sh
bun run build --filter=web
bun run dev   --filter=api
bun run test  --filter=isbn
```

`lint` scripts run with `--max-warnings=0`, so a warning fails CI.

## Git hooks

`bun install` installs husky via the `prepare` script — no extra setup step. On commit:

- **pre-commit** — `lint-staged` formats staged files with Prettier and runs `bun run lint`
  if any TypeScript is staged.
- **commit-msg** — `commitlint` enforces
  [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:` …).

Use `git commit --no-verify` to bypass both in a pinch.

## Environment variables

Root `.env` (consumed by `dev.compose.yaml` / `compose.yaml`):

| Variable               | Purpose                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Better Auth session signing secret (API)                                                         |
| `DATABASE_URL`         | Postgres connection string (migration + API)                                                     |
| `REDIS_URL`            | Dragonfly connection string — the shared notification queue, so API and notifications must agree |
| `REDIS_PASSWORD`       | Dragonfly's own password (`DFLY_requirepass`) and healthcheck                                    |
| `TURNSTILE_SITE_KEY`   | Cloudflare Turnstile site key (web build)                                                        |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret (API)                                                                |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID (API)                                                                     |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (API)                                                                 |
| `SMTP_HOST`            | SMTP relay host (notifications)                                                                  |
| `SMTP_PORT`            | SMTP relay port (notifications)                                                                  |
| `SMTP_SECURE`          | Implicit TLS — `false` in both dev and production                                                |
| `SMTP_USER`            | SMTP username — leave unset against local Mailpit                                                |
| `SMTP_PASS`            | SMTP password — leave unset against local Mailpit                                                |
| `MAIL_FROM`            | From address on outgoing mail (notifications)                                                    |

Locally the SMTP block points at Mailpit (`SMTP_HOST=mailpit`, `SMTP_PORT=1025`, no
credentials); in production it's the Resend relay. See `apps/api/sample.env`,
`apps/notifications/sample.env`, and `apps/web/sample.env` for per-app variables.

## Deployment

The production stack lives in `compose.yaml` and pulls pre-built images
from GHCR. The `migration` service reuses the api image to run
`bun run db:migrate latest` once and exit; `api` starts only after the migration
completes successfully and Dragonfly is healthy. `notifications` waits on Dragonfly
alone. Cover images are persisted to a named `storage_data` volume mounted at
`/storage`.

To build locally with Traefik routing on `readometer.local`, use
`dev.compose.yaml` (add `127.0.0.1 readometer.local` to `/etc/hosts`).

## CI/CD

- `.github/workflows/ci.yaml` — lint, typecheck, test, and build on every PR and
  `main` push, with remote turbo caching.
- `.github/workflows/cd.yaml` — on a successful CI run against `main`, builds
  `apps/api`, `apps/notifications`, and `apps/web` for `linux/amd64` and
  `linux/arm64` and publishes them to GHCR tagged with both the commit SHA and
  `latest`, then deploys the compose stack to Dokploy and polls until the
  deployment settles, so a failed rollout fails the job. The `deploy` job runs in
  the `production` GitHub environment, which records each deploy under the
  repository's Deployments UI. Needs `DOKPLOY_API_KEY` (secret) plus
  `DOKPLOY_URL` and `DOKPLOY_COMPOSE_ID` (variables) on that environment. Also
  runnable via `workflow_dispatch`.

CD's two jobs are wired with `needs:`, not a second `workflow_run` hop — a typo in
a `needs:` target fails at parse time, whereas an unmatched `workflow_run` name
silently never fires. The one remaining name coupling is CD's `workflows: ["CI"]`.

Because `workflow_run` runs in the context of the default branch, `github.sha`
there is main's tip at start time rather than the commit whose CI passed. CD
resolves `DEPLOY_SHA` from `workflow_run.head_sha` and uses it for both the
checkout ref and the image tags, so back-to-back merges can't tag one commit's
build with another's SHA.
