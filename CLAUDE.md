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

## Shared ESLint config (`packages/eslint-config`)

Every workspace's `eslint.config.ts` is a one-line re-export of a preset from here —
`eslint-config/base` (the two libraries), `eslint-config/node` (api, notifications), or
`eslint-config/react` (web). Rule changes belong in this package, not in a consumer.

- **This package is the only workspace that declares the ESLint plugins.** Consumers
  declare just `eslint` (for the binary) plus `eslint-config: "workspace:*"`. Adding a
  plugin to a consumer risks a `Cannot redefine plugin` startup failure, because flat
  config identity-checks plugin instances and Bun's isolated linker can resolve the same
  plugin to two different store entries.
- Global ignores (`dist`, `dev-dist`, `coverage`, `.turbo`) live in `base` and resolve
  against each _consumer's_ directory, so they stay correctly scoped.
- `eslint-plugin-react` is pinned at `^7.37.5`, which declares `eslint ^9.7` while the repo
  runs ESLint 10 — `bun install` prints one expected unmet-peer warning. It works today;
  `@eslint-react/eslint-plugin` is the fallback if a future ESLint bump breaks it.
- `lint` scripts run with `--max-warnings=0`, so a warning fails CI.

## Shared TypeScript config (`packages/typescript-config`)

Every `tsconfig.json` is an `extends` plus, at most, its own `types`/`paths`/`include` —
`typescript-config/base.json` everywhere, except `.../react.json` (web's app project), which is
`base` with `DOM` libs added. Compiler-option changes belong in this package, not in a consumer.

- **Relative paths must stay in the consumer.** TypeScript resolves `include`, `exclude`,
  `paths`, and `tsBuildInfoFile` against the file that _declares_ them, so anything hoisted
  into a preset would resolve against `packages/typescript-config/`. Only
  environment-describing options (`lib` and the strictness flags) live in the presets.
- **`types` stays in the consumer too**, even though it is not a path: `extends` _replaces_
  arrays rather than merging them, so a preset that set `types: ["bun"]` could not be extended
  by `apps/notifications`, which needs `["bun", "nodemailer"]`. Each consumer names its own.
- Consumers `extends` the `.json` file path (`typescript-config/base.json`), not a bare
  subpath. The package intentionally has no `exports` map, so `extends` resolves as a plain
  file lookup through the workspace symlink.
- There is exactly one dialect: everything targets `ESNext` with `module: "Preserve"` and
  `moduleResolution: "bundler"`. `apps/web` used to sit on the stock Vite template
  (`target: ES2024`, no `noUncheckedIndexedAccess`) and no longer does.
- `noUnusedLocals`/`noUnusedParameters` are **on**, so `tsc` overlaps
  `@typescript-eslint/no-unused-vars` — an unused local fails both `typecheck` and `lint`.
- `erasableSyntaxOnly` is on repo-wide, so `enum`, `namespace`, and constructor parameter
  properties are compile errors in api and notifications too — even though Bun runs all three
  natively. The point is that every file stays transform-only erasable.
- `allowJs` is deliberately **off**. Nothing in the repo is JavaScript, and api/notifications
  declare no `include`, so enabling it pulled their own `dist/` and `coverage/` output into the
  program (a 2.5 MB bundle, and a typecheck that varied by what happened to be on disk).

## Environment Variables

Each app has a committed `sample.env` listing its variables — copy it to `.env`. What the
samples don't tell you:

- **SMTP** (`apps/notifications`): locally `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, with
  `SMTP_USER`/`SMTP_PASS` unset. In production it's Resend's relay — `smtp.resend.com`,
  port `587`, user `resend`, password = the Resend API key. `SMTP_SECURE=false` in both.
- `REDIS_URL` must be the same value in `apps/api` and `apps/notifications` — they share
  the notification queue.
