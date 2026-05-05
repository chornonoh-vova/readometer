# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Readometer is a reading tracker and activity visualizer. It's a Turborepo monorepo with:
- `apps/api` — Hono REST API running on Bun with PostgreSQL
- `apps/web` — React 19 + Vite SPA/PWA
- `packages/isbn` — shared ISBN validation library

**Package manager**: Bun (required — do not use npm/yarn/pnpm)

## Commands

### Root (run from repo root)

```bash
bun run build       # build all workspaces
bun run dev         # start all dev servers concurrently
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

# Or from within the workspace directory
cd apps/api && bun run test
cd apps/web && bun run test

# API-specific
cd apps/api && bun run db:migrate    # run pending migrations
cd apps/api && bun run db:generate   # regenerate src/lib/db.d.ts from schema

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

Start the local Postgres and Traefik stack:

```bash
docker compose -f dev.compose.yaml up -d
```

Then start the API and web dev servers (both required):

```bash
bun run dev
```

Web proxies `/api` → `http://localhost:3000` via Vite config. Auth uses cookie-based sessions.

## Architecture

### API (`apps/api`)

- **Hono** for routing with a middleware chain: cors → compress → request-id → logger → routes
- **Kysely** for type-safe SQL queries against PostgreSQL; types in `src/lib/db.d.ts` are auto-generated
- **Better Auth** handles email+password auth, Cloudflare Turnstile CAPTCHA, and session cookies
- **Sharp** processes cover images into WebP at 200px and 400px widths, and extracts dominant color
- Route modules live in `src/routes/`; all authenticated routes check session middleware

**Testing**: Vitest + testcontainers spins up a real PostgreSQL 16 container per test run. Coverage thresholds: lines/statements 85%, functions 80%, branches 70%.

### Web (`apps/web`)

- **TanStack Router** with file-based routing under `src/routes/`. The `_auth/` group guards all app routes; `_auth/_app.tsx` is the app shell with sidebar and reading session overlay.
- **TanStack Query** for server state. Query keys are centralized in `src/lib/query-keys.ts`. Per-resource hooks in `src/lib/` (e.g., `books.ts`, `reading-sessions.ts`) handle fetching and mutations — mutations invalidate relevant query keys.
- **TanStack Form + Zod** for all form handling and client-side validation.
- **Zustand** (`src/store/reading-session.ts`) persists the active reading session to `localStorage`.
- **shadcn/ui + Base UI + Tailwind CSS v4** for UI components.

**Testing**: Vitest + jsdom + React Testing Library. Test files are co-located as `.spec.tsx`.

### ISBN package (`packages/isbn`)

Pure TypeScript library exporting `isbnSchema` (Zod) and `normalizeIsbnToIsbn13`. Used by both the API and web.

## Environment Variables

**API** (`.env` in `apps/api`):
```
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:5173
TURNSTILE_SECRET_KEY=<key>
STORAGE_PATH=storage
PORT=3000
```

**Web** (`.env` in `apps/web`):
```
VITE_TURNSTILE_SITE_KEY=<public-site-key>
```
