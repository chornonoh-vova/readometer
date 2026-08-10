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
│   ├── api/         # Hono + Bun REST API (see apps/api/README.md)
│   └── web/         # React + Vite PWA frontend (see apps/web/README.md)
├── packages/
│   └── isbn/        # Shared ISBN-10/13 validator and normalizer
├── compose.yaml     # Production compose stack (published images)
└── dev.compose.yaml # Local compose stack with Postgres + Traefik
```

## Stack

- **Runtime & tooling**: Bun, Turborepo, TypeScript
- **API**: [Hono](https://hono.dev), [Kysely](https://kysely.dev),
  [Better Auth](https://better-auth.com) with Cloudflare Turnstile captcha,
  [Sharp](https://sharp.pixelplumbing.com) for cover images, PostgreSQL
- **Web**: React 19, Vite, Tailwind CSS v4, shadcn/ui, TanStack Router,
  TanStack Query, TanStack Form, Zustand, `vite-plugin-pwa`
- **Deployment**: Docker images published to GHCR
  (`ghcr.io/chornonoh-vova/readometer-api`,
  `ghcr.io/chornonoh-vova/readometer-web`)

## Prerequisites

- [Bun](https://bun.com) ≥ 1.3 (pinned via `packageManager`)
- Node.js ≥ 18 (for tools that need it)
- PostgreSQL 18 (or run via `dev.compose.yaml`)
- A Cloudflare Turnstile site key/secret — the `sample.env` files include
  dummy test keys that always pass.

## Getting started

```sh
# Install workspace dependencies
bun install

# Copy environment samples
cp sample.env .env
cp apps/api/sample.env apps/api/.env
cp apps/notifications/sample.env apps/notifications/.env
cp apps/web/sample.env apps/web/.env

# Start Postgres (the dev compose file also includes it)
docker compose -f dev.compose.yaml up postgres -d

# Run database migrations
bun --cwd apps/api run db:migrate

# Start everything in watch mode
bun run dev
```

The web app will be served on <http://localhost:5173> and the API on
<http://localhost:3000>. Vite proxies `/api` to the API server, so no CORS
setup is needed in development.

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

Filter to a single workspace with `--filter`:

```sh
bun run build --filter=api
bun run dev   --filter=web
bun run test  --filter=isbn
```

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
from GHCR. The `migration` service runs `bun dist/index.js migrate` once
and exits; the `api` service starts only after the migration completes
successfully. Cover images are persisted to a named `storage_data` volume
mounted at `/storage`.

To build locally with Traefik routing on `readometer.local`, use
`dev.compose.yaml` (add `127.0.0.1 readometer.local` to `/etc/hosts`).

## CI/CD

- `.github/workflows/ci.yaml` — lint, typecheck, and test on every PR and
  `main` push.
- `.github/workflows/docker.yaml` — on a successful CI run against `main`,
  builds `apps/api` and `apps/web` for `linux/amd64` and `linux/arm64`,
  and publishes to GHCR tagged with both the commit SHA and `latest`.
