# apps/api tests

Vitest-based test suite. Run with:

```sh
bun --cwd apps/api run test
bun --cwd apps/api run test:watch
bun --cwd apps/api run test:coverage
```

## Requirements

- **Docker** — the harness starts a disposable Postgres 18.1 container via
  [Testcontainers](https://node.testcontainers.org). CI runs on
  `ubuntu-latest`, which has Docker preinstalled; locally you need Docker
  Desktop / Colima / Orbstack running before `bun run test`.

## How it's wired

- `test/globalSetup.ts` starts the Postgres container, creates a temp
  directory for `STORAGE_PATH`, sets all `process.env` values the app
  reads at module load, and runs Kysely migrations.
- `test/setup.ts` installs the auth mock, truncates tables between
  tests, and wipes the storage tmp dir between tests.
- `test/mocks/auth.ts` replaces `auth.api.getSession` with a spy that
  returns whatever `setAuthenticatedUser(user)` last set.
- `test/helpers/request.ts` exposes `call(method, path, { as, body, formData })`
  — a thin wrapper around `app.request(...)` that configures the auth
  spy and sets `content-type`.
- `test/helpers/factories.ts` seeds users/books/runs/sessions directly
  through Kysely. Use these for arrange steps; reserve HTTP calls for
  the actions being exercised.

## Conventions

- **Never import `src/` at the top level of a test file outside the
  helpers.** Module-level env (e.g. `process.env.DATABASE_URL`,
  `STORAGE_PATH`) must be set by `globalSetup` before the DB pool or
  `bookCovers` route captures it. Importing via the helpers guarantees
  the load order.
- Route specs live next to the source as `src/routes/<name>.spec.ts`
  (matches `packages/isbn/src/index.spec.ts`).
- Tests run in a single fork (see `vitest.config.ts`). That keeps the
  shared Postgres pool and the auth spy race-free.
