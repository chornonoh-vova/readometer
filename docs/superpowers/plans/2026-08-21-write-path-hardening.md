# Write-Path Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make it impossible for one account (or one unauthenticated request) to write unbounded data to Postgres, closing the vector that grew the production database ~30GB in minutes.

**Architecture:** Five independent layers. Tiered request body limits bound bytes per request; Zod `.max()` caps bound bytes per stored field; better-auth `databaseHooks` bound the unauthenticated signup path that no route-level quota can see; per-user row quotas (a `COUNT` before each insert) bound rows per account; a Dragonfly fixed-window limiter bounds writes per hour. Layers are additive — each is useful alone, and none depends on another's correctness.

**Tech Stack:** Bun, Hono 4.12, Zod 4, Kysely, better-auth 1.6, Vitest + Testcontainers (Postgres 18.1)

**Spec:** `docs/superpowers/specs/2026-08-21-write-path-hardening-design.md`

## Global Constraints

- Package manager is **Bun**. Never npm/yarn/pnpm.
- Run tests with `bun --cwd apps/api run test`. Requires Docker running (Testcontainers).
- Lint runs with `--max-warnings=0`; a warning fails CI. `noUnusedLocals`/`noUnusedParameters` are on, so an unused import fails `typecheck` _and_ `lint`.
- `erasableSyntaxOnly` is on: no `enum`, no `namespace`, no constructor parameter properties.
- Prefer Kysely query builders over raw SQL; use ` sql` `` only where no builder exists.
- Formatting is repo-root only: `bun run fmt`. Never add a Prettier config to a workspace.
- Commits must follow Conventional Commits (enforced by the `commit-msg` husky hook).
- Route specs live beside the source as `src/routes/<name>.spec.ts`.
- **Never import `src/` at the top level of a test file outside the helpers.** Module-level env must be set by `globalSetup` first. Import `db` only via the pattern already used in existing specs (after the helper imports).
- Work on branch `fix/write-path-hardening`. Single PR.

**Final agreed limits — copy these values verbatim:**

| Constant                                              | Value          |
| ----------------------------------------------------- | -------------- |
| `booksPerUser`                                        | 1_000          |
| `runsPerBook`                                         | 5              |
| `sessionsPerUser`                                     | 5_000          |
| `sessionsPerRun`                                      | 100            |
| `bookTitle`                                           | 256            |
| `bookDescription`                                     | 1_000          |
| `bookAuthor`                                          | 128            |
| `userName`                                            | 128            |
| `userAgent`                                           | 512            |
| `tz`                                                  | 64             |
| `pages` (totalPages/startPage/endPage/completedPages) | 50_000         |
| `readTimeSeconds`                                     | 86_400         |
| body limit: auth                                      | 16 KB          |
| body limit: json                                      | 64 KB          |
| body limit: upload                                    | 8 MB           |
| `writesPerWindow`                                     | 100            |
| `windowSeconds`                                       | 3_600 (1 hour) |

---

## File Structure

**Create:**

- `apps/api/src/lib/limits.ts` — every numeric constant in one place. No logic.
- `apps/api/src/lib/quota.ts` — per-user quota assertions. Owns the `COUNT` queries and the 403.
- `apps/api/src/lib/quota.spec.ts`
- `apps/api/src/lib/disposableDomains.ts` — vendored blocklist data. No logic.
- `apps/api/src/lib/accountPolicy.ts` — pure predicates for the auth path. No DB, no Hono.
- `apps/api/src/lib/accountPolicy.spec.ts`
- `apps/api/src/middlewares/bodyLimit.ts` — tier selection + the three `bodyLimit` instances.
- `apps/api/src/middlewares/bodyLimit.spec.ts`
- `apps/api/src/middlewares/writeRateLimit.ts` — fixed-window per-user write limiter.
- `apps/api/src/middlewares/writeRateLimit.spec.ts`
- `apps/api/scripts/purge-bot-accounts.ts` — one-off cleanup.
- `apps/api/scripts/sweep-orphan-covers.ts` — reconcile `STORAGE_PATH/covers` against `book.coverId`.

**Modify:**

- `apps/api/src/app.ts` — register the body-limit middleware early and the write limiter after `requireAuth()`.
- `apps/api/src/lib/auth.ts` — add `databaseHooks`.
- `apps/api/src/routes/books.ts` + spec — field caps, book quota, unlink covers on delete.
- `apps/api/src/routes/readingRuns.ts` + spec — field caps, run quota.
- `apps/api/src/routes/readingSessions.ts` + spec — field caps, session quotas.
- `apps/api/src/routes/goals.ts` + spec — target caps, `tz` cap.
- `apps/api/src/routes/readingActivity.ts` + spec — `tz` cap.
- `apps/api/src/routes/bookCovers.ts` + spec — MIME allowlist, size backstop, ENOENT fix.
- `apps/web/src/components/register-form.tsx` + spec — client-side `name` max, for parity only.
- `apps/api/test/mocks/redis.ts` — add `incr`/`expire`/`ttl`/`multi` and a `resetRedisMock()`.
- `apps/api/test/setup.ts` — call `resetRedisMock()` in `beforeEach`.

**Why `accountPolicy.ts` is separate from `auth.ts`:** `test/setup.ts` calls `installAuthMock()`, which replaces `auth.api.getSession`. The better-auth handler is never exercised by `call()`, so `databaseHooks` cannot be integration-tested through HTTP. Extracting the decisions into pure functions makes them unit-testable; the hooks become thin wrappers with nothing worth testing.

---

### Task 1: Limits module and tiered body-limit middleware

This is the layer that stops the bleeding, so it lands first and alone.

**Files:**

- Create: `apps/api/src/lib/limits.ts`
- Create: `apps/api/src/middlewares/bodyLimit.ts`
- Create: `apps/api/src/middlewares/bodyLimit.spec.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**

- Produces: `FIELD_LIMITS`, `QUOTAS`, `BODY_LIMITS` (all `as const` objects) from `../lib/limits.ts`; `limitForPath(path: string): keyof typeof BODY_LIMITS` and `requestBodyLimit(): MiddlewareHandler` from `../middlewares/bodyLimit.ts`.
- Consumes: nothing.

- [ ] **Step 1: Create the limits module**

`apps/api/src/lib/limits.ts`:

```ts
/** Maximum accepted length of each user-supplied field. */
export const FIELD_LIMITS = {
  bookTitle: 256,
  bookDescription: 1_000,
  bookAuthor: 128,
  userName: 128,
  /** Truncated, not rejected: a long UA is not worth failing a login over. */
  userAgent: 512,
  tz: 64,
  /** Longest books in print are ~13k pages; 50k is unreachable slack. */
  pages: 50_000,
  /** Seconds. `/goals/progress` divides this by 60. */
  readTimeSeconds: 86_400,
  goalDailyMinutes: 1_440,
  goalDailyPages: 10_000,
  goalYearlyBooks: 1_000,
} as const;

/**
 * Per-account row ceilings. Nested quotas multiply, so `sessionsPerUser` is
 * the only real bound: 1_000 books x 5 runs x 100 sessions = 500_000, two
 * orders of magnitude above it. `sessionsPerRun` exists to catch a runaway
 * client loop early with a clear error, and must never be used to derive the
 * per-user total.
 */
export const QUOTAS = {
  booksPerUser: 1_000,
  runsPerBook: 5,
  sessionsPerUser: 5_000,
  sessionsPerRun: 100,
} as const;

/**
 * Request body ceilings by route tier. `auth` is tightest because better-auth
 * owns that handler and we cannot add Zod caps inside it.
 */
export const BODY_LIMITS = {
  auth: 16 * 1024,
  json: 64 * 1024,
  upload: 8 * 1024 * 1024,
} as const;
```

- [ ] **Step 2: Write the failing test for tier selection**

`apps/api/src/middlewares/bodyLimit.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { limitForPath } from "./bodyLimit";

describe("limitForPath", () => {
  it.each([
    ["/api/auth/sign-up/email", "auth"],
    ["/api/auth/sign-in/email", "auth"],
    ["/api/books/01999999-9999-7999-8999-999999999999/cover", "upload"],
    ["/api/books", "json"],
    ["/api/books/01999999-9999-7999-8999-999999999999", "json"],
    ["/api/reading-sessions", "json"],
    ["/api/goals", "json"],
  ])("maps %s to the %s tier", (path, expected) => {
    expect(limitForPath(path)).toBe(expected);
  });

  it("does not treat a nested path under cover as an upload", () => {
    expect(limitForPath("/api/books/abc/cover/extra")).toBe("json");
  });

  it("does not treat a path merely containing 'auth' as the auth tier", () => {
    expect(limitForPath("/api/books/authors")).toBe("json");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun --cwd apps/api run test src/middlewares/bodyLimit.spec.ts`
Expected: FAIL — cannot resolve `./bodyLimit`.

- [ ] **Step 4: Implement the middleware**

`apps/api/src/middlewares/bodyLimit.ts`:

```ts
import { bodyLimit } from "hono/body-limit";
import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types.ts";
import { BODY_LIMITS } from "../lib/limits.ts";

const COVER_PATH = /^\/api\/books\/[^/]+\/cover$/;

/**
 * Which body-size tier a path falls into.
 *
 * Exported separately from the middleware so tier routing can be tested
 * without allocating multi-megabyte request bodies.
 */
export function limitForPath(path: string): keyof typeof BODY_LIMITS {
  if (path.startsWith("/api/auth/")) return "auth";
  if (COVER_PATH.test(path)) return "upload";
  return "json";
}

const tiers: Record<keyof typeof BODY_LIMITS, MiddlewareHandler> = {
  auth: bodyLimit({
    maxSize: BODY_LIMITS.auth,
    onError: (c) => c.json({ message: "Request body too large" }, 413),
  }),
  json: bodyLimit({
    maxSize: BODY_LIMITS.json,
    onError: (c) => c.json({ message: "Request body too large" }, 413),
  }),
  upload: bodyLimit({
    maxSize: BODY_LIMITS.upload,
    onError: (c) => c.json({ message: "Request body too large" }, 413),
  }),
};

/**
 * One middleware that picks the tier, rather than three overlapping
 * `app.use()` registrations. Hono runs *every* matching middleware in
 * registration order, so a wildcard 64KB limit registered alongside an 8MB
 * cover limit would reject cover uploads. One decision, one place.
 */
export const requestBodyLimit = (): MiddlewareHandler =>
  createMiddleware<AppEnv>((c, next) =>
    tiers[limitForPath(c.req.path)](c, next),
  );
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun --cwd apps/api run test src/middlewares/bodyLimit.spec.ts`
Expected: PASS (9 assertions).

- [ ] **Step 6: Register the middleware in `app.ts`**

Add the import beside the other middleware imports:

```ts
import { requestBodyLimit } from "./middlewares/bodyLimit.ts";
```

Then insert it immediately after `app.use(csrf())`, so it runs before the `/auth/*` handler and before `requireAuth()`:

```ts
app.use(csrf());
app.use(requestBodyLimit());
app.use(compress());
```

Placement matters: the `/auth/*` handler is mounted _above_ `app.use("*", requireAuth())`, so a limit registered later would not cover the signup endpoint — which is the one that needs it most.

- [ ] **Step 7: Write the integration test for a rejected oversized body**

Append to `apps/api/src/middlewares/bodyLimit.spec.ts`:

```ts
import { call } from "../../test/helpers/request";
import { BODY_LIMITS } from "../lib/limits";

describe("request body limits (integration)", () => {
  it("rejects an oversized JSON body with 413 before auth runs", async () => {
    const response = await call("POST", "/api/books", {
      body: { title: "x".repeat(BODY_LIMITS.json + 1_000) },
    });

    expect(response.status).toBe(413);
    const body = (await response.json()) as { message: string };
    expect(body.message).toBe("Request body too large");
  });

  it("rejects an oversized signup body with 413", async () => {
    const response = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "x".repeat(BODY_LIMITS.auth + 1_000),
        email: "probe@example.com",
        password: "correct horse battery staple",
      },
    });

    expect(response.status).toBe(413);
  });

  it("allows a body under the JSON limit through to normal handling", async () => {
    const response = await call("POST", "/api/books", {
      body: { title: "ok" },
    });

    // 401, not 413: the limit passed and requireAuth rejected it instead.
    expect(response.status).toBe(401);
  });
});
```

The 413-before-401 ordering is the assertion that proves placement is correct. The third test is the regression guard against setting the limit too low.

- [ ] **Step 8: Run the full suite**

Run: `bun --cwd apps/api run test`
Expected: PASS. No existing spec should break — no current test posts a body near 64KB.

- [ ] **Step 9: Lint, typecheck, format**

```bash
bun turbo run lint typecheck --filter=api
bun run fmt
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/lib/limits.ts apps/api/src/middlewares/bodyLimit.ts \
        apps/api/src/middlewares/bodyLimit.spec.ts apps/api/src/app.ts
git commit -m "fix(api): add tiered request body size limits"
```

---

### Task 2: Book field caps

**Files:**

- Modify: `apps/api/src/routes/books.ts:97-106` (`createBookSchema`), `:132-140` (`updateBookSchema`)
- Test: `apps/api/src/routes/books.spec.ts`

**Interfaces:**

- Consumes: `FIELD_LIMITS` from `../lib/limits.ts`.
- Produces: nothing new.

Note: the update route is `books.put("/:bookId", ...)`, not PATCH. Both schemas need caps — the update path can rewrite the same row repeatedly, and every rewrite is a new row version plus WAL, so an uncapped update is a _worse_ amplifier than an uncapped insert.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/routes/books.spec.ts` inside the top-level `describe("/api/books")`:

```ts
describe("field limits", () => {
  it("rejects a title over the limit", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: {
        id: uuidv7(),
        title: "x".repeat(257),
        totalPages: 300,
      },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a description over the limit", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: {
        id: uuidv7(),
        title: "Fine",
        description: "x".repeat(1_001),
        totalPages: 300,
      },
    });

    expect(response.status).toBe(400);
  });

  it("rejects an author over the limit", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: {
        id: uuidv7(),
        title: "Fine",
        author: "x".repeat(129),
        totalPages: 300,
      },
    });

    expect(response.status).toBe(400);
  });

  it("accepts fields exactly at the limit", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: {
        id: uuidv7(),
        title: "x".repeat(256),
        description: "y".repeat(1_000),
        author: "z".repeat(128),
        totalPages: 300,
      },
    });

    expect(response.status).toBe(201);
  });

  it("rejects a non-integer totalPages with 400, not 500", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Fine", totalPages: 1.5 },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a totalPages beyond int4 with 400, not 500", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Fine", totalPages: 1e12 },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a language longer than two characters with 400, not 500", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Fine", totalPages: 300, language: "eng" },
    });

    expect(response.status).toBe(400);
  });

  it("rejects an over-long description on update", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });

    const response = await call("PUT", `/api/books/${book.id}`, {
      as: user,
      body: { description: "x".repeat(1_001) },
    });

    expect(response.status).toBe(400);
  });
});
```

The three "400, not 500" tests are the interesting ones: those inputs already fail today, but as a Postgres error surfaced as a 500.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun --cwd apps/api run test src/routes/books.spec.ts -t "field limits"`
Expected: FAIL — over-long values return 201, and the `totalPages`/`language` cases return 500.

- [ ] **Step 3: Add the caps**

Add the import at the top of `apps/api/src/routes/books.ts`:

```ts
import { FIELD_LIMITS } from "../lib/limits.ts";
```

Replace `createBookSchema`:

```ts
const createBookSchema = z.object({
  id: z.uuidv7(),
  title: z.string().trim().nonempty().max(FIELD_LIMITS.bookTitle),
  description: z.string().trim().max(FIELD_LIMITS.bookDescription).optional(),
  author: z.string().trim().max(FIELD_LIMITS.bookAuthor).optional(),
  totalPages: z.number().int().positive().max(FIELD_LIMITS.pages),
  publishDate: partialDateSchema.optional(),
  isbn: isbnSchema.optional(),
  // `book.language` is char(2); without this the DB raises a 500 instead of a 400.
  language: z.string().trim().length(2).optional(),
});
```

Replace `updateBookSchema`:

```ts
const updateBookSchema = z.object({
  title: z.string().trim().nonempty().max(FIELD_LIMITS.bookTitle).optional(),
  description: z.string().trim().max(FIELD_LIMITS.bookDescription).optional(),
  author: z.string().trim().max(FIELD_LIMITS.bookAuthor).optional(),
  totalPages: z.number().int().positive().max(FIELD_LIMITS.pages).optional(),
  publishDate: partialDateSchema.optional(),
  isbn: isbnSchema.optional(),
  language: z.string().trim().length(2).optional(),
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/routes/books.spec.ts`
Expected: PASS. If a pre-existing test seeds a `language` longer than 2 chars, fix the fixture — the DB would already have rejected it.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/books.ts apps/api/src/routes/books.spec.ts
git commit -m "fix(api): cap book title, description, author, and page fields"
```

---

### Task 3: Reading run, session, goal, and activity field caps

**Files:**

- Modify: `apps/api/src/routes/readingRuns.ts:31-37`, `:69-73`
- Modify: `apps/api/src/routes/readingSessions.ts:34-42`, `:112-119`
- Modify: `apps/api/src/routes/goals.ts:12-24` (`upsertGoalSchema`), `:69-72` (`progressSchema`)
- Modify: `apps/api/src/routes/readingActivity.ts:15-19`
- Test: the four corresponding `.spec.ts` files

**Interfaces:**

- Consumes: `FIELD_LIMITS` from `../lib/limits.ts`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/routes/readingSessions.spec.ts`:

```ts
describe("field limits", () => {
  it("rejects a readTime beyond one day", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });
    const run = await makeRun({ userId: user.id, bookId: book.id });

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: {
        id: uuidv7(),
        runId: run.id,
        startPage: 1,
        endPage: 10,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        readTime: 86_401,
      },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a non-integer readTime with 400, not 500", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });
    const run = await makeRun({ userId: user.id, bookId: book.id });

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: {
        id: uuidv7(),
        runId: run.id,
        startPage: 1,
        endPage: 10,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        readTime: 12.5,
      },
    });

    expect(response.status).toBe(400);
  });
});
```

Add to `apps/api/src/routes/goals.spec.ts`:

```ts
describe("field limits", () => {
  it("rejects a daily minutes target above a day's worth", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/goals", {
      as: user,
      body: { id: uuidv7(), type: "daily", metric: "minutes", target: 1_441 },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a target beyond int4 with 400, not 500", async () => {
    const user = await makeUser();

    const response = await call("POST", "/api/goals", {
      as: user,
      body: { id: uuidv7(), type: "yearly", metric: "books", target: 1e12 },
    });

    expect(response.status).toBe(400);
  });

  it("rejects an over-long tz query parameter", async () => {
    const user = await makeUser();

    const response = await call(
      "GET",
      `/api/goals/progress?date=2026-05-07&tz=${"x".repeat(65)}`,
      { as: user },
    );

    expect(response.status).toBe(400);
  });
});
```

Add to `apps/api/src/routes/readingActivity.spec.ts`:

```ts
it("rejects an over-long tz query parameter", async () => {
  const user = await makeUser();

  const response = await call(
    "GET",
    `/api/reading-activity?from=2026-01-01&to=2026-02-01&tz=${"x".repeat(65)}`,
    { as: user },
  );

  expect(response.status).toBe(400);
});
```

Add to `apps/api/src/routes/readingRuns.spec.ts`:

```ts
it("rejects a completedPages beyond the page limit", async () => {
  const user = await makeUser();
  const book = await makeBook({ userId: user.id });

  const response = await call("POST", "/api/reading-runs", {
    as: user,
    body: {
      id: uuidv7(),
      bookId: book.id,
      completedPages: 50_001,
      startedAt: new Date().toISOString(),
    },
  });

  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
bun --cwd apps/api run test src/routes/readingSessions.spec.ts src/routes/goals.spec.ts \
  src/routes/readingActivity.spec.ts src/routes/readingRuns.spec.ts
```

Expected: FAIL on the new cases.

- [ ] **Step 3: Add caps to `readingRuns.ts`**

Import `FIELD_LIMITS` from `../lib/limits.ts`, then:

```ts
const createReadingRunSchema = z.object({
  id: z.uuidv7(),
  bookId: z.uuidv7(),
  completedPages: z.number().int().nonnegative().max(FIELD_LIMITS.pages),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().optional(),
});

const updateReadingRunSchema = z.object({
  completedPages: z
    .number()
    .int()
    .positive()
    .max(FIELD_LIMITS.pages)
    .optional(),
  finishedAt: z.iso.datetime().optional(),
  abandoned: z.boolean().optional(),
});
```

- [ ] **Step 4: Add caps to `readingSessions.ts`**

Import `FIELD_LIMITS` from `../lib/limits.ts`, then:

```ts
const createReadingSessionSchema = z.object({
  id: z.uuidv7(),
  runId: z.uuidv7(),
  startPage: z.number().int().nonnegative().max(FIELD_LIMITS.pages),
  endPage: z.number().int().positive().max(FIELD_LIMITS.pages),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  readTime: z.number().int().positive().max(FIELD_LIMITS.readTimeSeconds),
});

const updateReadingSessionSchema = z.object({
  startPage: z.number().int().nonnegative().max(FIELD_LIMITS.pages).optional(),
  endPage: z.number().int().positive().max(FIELD_LIMITS.pages).optional(),
  startTime: z.iso.datetime().optional(),
  endTime: z.iso.datetime().optional(),
  readTime: z
    .number()
    .int()
    .positive()
    .max(FIELD_LIMITS.readTimeSeconds)
    .optional(),
  updateRun: z.boolean(),
});
```

- [ ] **Step 5: Add caps to `goals.ts`**

Import `FIELD_LIMITS` from `../lib/limits.ts`. Replace `upsertGoalSchema` — note the daily branch splits by metric, so each metric gets its own ceiling:

```ts
const upsertGoalSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.uuidv7(),
    type: z.literal("daily"),
    metric: z.literal("minutes"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalDailyMinutes),
  }),
  z.object({
    id: z.uuidv7(),
    type: z.literal("daily"),
    metric: z.literal("pages"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalDailyPages),
  }),
  z.object({
    id: z.uuidv7(),
    type: z.literal("yearly"),
    metric: z.literal("books"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalYearlyBooks),
  }),
]);
```

`z.discriminatedUnion` discriminates on `type` alone, and two branches now share `type: "daily"`. If Zod 4 rejects duplicate discriminator values, use this equivalent instead:

```ts
const upsertGoalSchema = z.union([
  z.object({
    id: z.uuidv7(),
    type: z.literal("daily"),
    metric: z.literal("minutes"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalDailyMinutes),
  }),
  z.object({
    id: z.uuidv7(),
    type: z.literal("daily"),
    metric: z.literal("pages"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalDailyPages),
  }),
  z.object({
    id: z.uuidv7(),
    type: z.literal("yearly"),
    metric: z.literal("books"),
    target: z.number().int().positive().max(FIELD_LIMITS.goalYearlyBooks),
  }),
]);
```

Verify which form compiles before moving on; the route body below is unchanged either way, because `request.type` and `request.metric` remain narrowed.

Then cap `tz` in `progressSchema`:

```ts
const progressSchema = z.object({
  date: z.iso.date(),
  tz: z.string().max(FIELD_LIMITS.tz),
});
```

- [ ] **Step 6: Add the `tz` cap to `readingActivity.ts`**

Import `FIELD_LIMITS` from `../lib/limits.ts` and change the one field:

```ts
const readingActivitySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  tz: z.string().max(FIELD_LIMITS.tz),
});
```

Leave both `.refine()` calls exactly as they are.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test`
Expected: PASS. Watch for existing goal specs that use a `target` above a new ceiling; those fixtures need lowering.

- [ ] **Step 8: Lint, typecheck, format, commit**

```bash
bun turbo run lint typecheck --filter=api
bun run fmt
git add apps/api/src/routes/
git commit -m "fix(api): cap numeric and timezone fields on run, session, goal, and activity routes"
```

---

### Task 4: Quota module and books-per-user quota

**Files:**

- Create: `apps/api/src/lib/quota.ts`
- Create: `apps/api/src/lib/quota.spec.ts`
- Modify: `apps/api/src/routes/books.ts` (the `books.post("/")` handler)

**Interfaces:**

- Consumes: `QUOTAS` from `../lib/limits.ts`.
- Produces: from `../lib/quota.ts` —
  - `assertBookQuota(userId: string): Promise<void>`
  - `assertRunQuota(userId: string, bookId: string): Promise<void>` (Task 5)
  - `assertSessionQuota(userId: string, runId: string): Promise<void>` (Task 6)

  All three throw `HTTPException(403)` when the ceiling is reached and resolve otherwise.

- [ ] **Step 1: Write the failing test**

`apps/api/src/lib/quota.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { call } from "../../test/helpers/request";
import { makeUser, makeBook } from "../../test/helpers/factories";
import { QUOTAS } from "./limits";
import { db } from "./database";

describe("book quota", () => {
  it("rejects a new book once the per-user ceiling is reached", async () => {
    const user = await makeUser();

    // Seed exactly to the ceiling in one statement — 1_000 individual inserts
    // through the factory would dominate the suite's runtime.
    await db
      .insertInto("book")
      .values(
        Array.from({ length: QUOTAS.booksPerUser }, () => ({
          id: uuidv7(),
          userId: user.id,
          title: "Seeded",
          totalPages: 300,
        })),
      )
      .execute();

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "One too many", totalPages: 300 },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("Book limit reached");
  });

  it("allows a new book one below the ceiling", async () => {
    const user = await makeUser();

    await db
      .insertInto("book")
      .values(
        Array.from({ length: QUOTAS.booksPerUser - 1 }, () => ({
          id: uuidv7(),
          userId: user.id,
          title: "Seeded",
          totalPages: 300,
        })),
      )
      .execute();

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Just fits", totalPages: 300 },
    });

    expect(response.status).toBe(201);
  });

  it("counts each user's books separately", async () => {
    const [user, other] = await Promise.all([makeUser(), makeUser()]);

    await db
      .insertInto("book")
      .values(
        Array.from({ length: QUOTAS.booksPerUser }, () => ({
          id: uuidv7(),
          userId: other.id,
          title: "Someone else's",
          totalPages: 300,
        })),
      )
      .execute();

    await makeBook({ userId: user.id });

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Mine", totalPages: 300 },
    });

    expect(response.status).toBe(201);
  });
});
```

The third test is the one that matters most: a quota that accidentally counts globally would pass the first two tests and lock every user out as soon as anyone hit the ceiling.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --cwd apps/api run test src/lib/quota.spec.ts`
Expected: FAIL — cannot resolve `./quota`… and once created, the first test returns 201 instead of 403.

- [ ] **Step 3: Implement the quota module**

`apps/api/src/lib/quota.ts`:

```ts
import { HTTPException } from "hono/http-exception";
import { db } from "./database.ts";
import { QUOTAS } from "./limits.ts";

/**
 * Per-account row ceilings, enforced as a COUNT before each insert.
 *
 * Deliberately not atomic: two concurrent requests can both pass the check and
 * overshoot a ceiling by a row or two. With this much headroom that does not
 * matter, and making it exact would mean a trigger or a constraint — which is
 * out of scope until the polluted tables have been cleaned up.
 */
async function countBooks(userId: string): Promise<number> {
  const row = await db
    .selectFrom("book")
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .where("userId", "=", userId)
    .executeTakeFirst();

  return Number(row?.total ?? 0);
}

export async function assertBookQuota(userId: string): Promise<void> {
  if ((await countBooks(userId)) >= QUOTAS.booksPerUser) {
    throw new HTTPException(403, {
      message: `Book limit reached (${QUOTAS.booksPerUser}). Delete a book before adding another.`,
    });
  }
}
```

`countAll<number>()` wrapped in `Number()` matches the existing pattern in `goals.ts` and `readingActivity.ts` — Postgres returns `bigint`, which the driver hands back as a string.

- [ ] **Step 4: Call it from the create-book handler**

In `apps/api/src/routes/books.ts`, add the import:

```ts
import { assertBookQuota } from "../lib/quota.ts";
```

Then in `books.post("/", ...)`, insert the check immediately after `userId` is read and before the insert is built:

```ts
books.post("/", zValidator("json", createBookSchema), async (c) => {
  const userId = c.get("user")!.id;
  await assertBookQuota(userId);

  const request = c.req.valid("json");
  // ...unchanged from here
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/lib/quota.spec.ts src/routes/books.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/quota.ts apps/api/src/lib/quota.spec.ts apps/api/src/routes/books.ts
git commit -m "feat(api): enforce a per-user book quota"
```

---

### Task 5: Runs-per-book quota

**Files:**

- Modify: `apps/api/src/lib/quota.ts`
- Modify: `apps/api/src/lib/quota.spec.ts`
- Modify: `apps/api/src/routes/readingRuns.ts` (the `readingRuns.post("/")` handler)

**Interfaces:**

- Consumes: `QUOTAS` from `../lib/limits.ts`.
- Produces: `assertRunQuota(userId: string, bookId: string): Promise<void>`.

This quota is scoped per _book_, not per user — five re-reads of one book, not five runs across the whole library.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/lib/quota.spec.ts`:

```ts
import { makeRun } from "../../test/helpers/factories";

describe("run quota", () => {
  it("rejects a new run once the per-book ceiling is reached", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });

    for (let i = 0; i < QUOTAS.runsPerBook; i++) {
      await makeRun({ userId: user.id, bookId: book.id });
    }

    const response = await call("POST", "/api/reading-runs", {
      as: user,
      body: {
        id: uuidv7(),
        bookId: book.id,
        completedPages: 0,
        startedAt: new Date().toISOString(),
      },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("Reading run limit reached");
  });

  it("scopes the run ceiling to one book, not the whole library", async () => {
    const user = await makeUser();
    const [full, fresh] = await Promise.all([
      makeBook({ userId: user.id }),
      makeBook({ userId: user.id }),
    ]);

    for (let i = 0; i < QUOTAS.runsPerBook; i++) {
      await makeRun({ userId: user.id, bookId: full.id });
    }

    const response = await call("POST", "/api/reading-runs", {
      as: user,
      body: {
        id: uuidv7(),
        bookId: fresh.id,
        completedPages: 0,
        startedAt: new Date().toISOString(),
      },
    });

    expect(response.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --cwd apps/api run test src/lib/quota.spec.ts -t "run quota"`
Expected: FAIL — `assertRunQuota` is not exported; the first case returns 201.

- [ ] **Step 3: Add the assertion**

Append to `apps/api/src/lib/quota.ts`:

```ts
async function countRuns(userId: string, bookId: string): Promise<number> {
  const row = await db
    .selectFrom("readingRun")
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .where("userId", "=", userId)
    .where("bookId", "=", bookId)
    .executeTakeFirst();

  return Number(row?.total ?? 0);
}

export async function assertRunQuota(
  userId: string,
  bookId: string,
): Promise<void> {
  if ((await countRuns(userId, bookId)) >= QUOTAS.runsPerBook) {
    throw new HTTPException(403, {
      message: `Reading run limit reached for this book (${QUOTAS.runsPerBook}).`,
    });
  }
}
```

The `(userId, bookId)` predicate matches the existing `readingRun_userId_bookId_idx` index, so this count is an index-only scan.

- [ ] **Step 4: Call it from the create-run handler**

In `apps/api/src/routes/readingRuns.ts`, add the import:

```ts
import { assertRunQuota } from "../lib/quota.ts";
```

Then in `readingRuns.post("/", ...)`:

```ts
readingRuns.post("/", zValidator("json", createReadingRunSchema), async (c) => {
  const userId = c.get("user")!.id;
  const request = c.req.valid("json");

  await assertRunQuota(userId, request.bookId);

  const createReadingRunQuery = db
    // ...unchanged from here
```

`request` must be read before the check here, because the quota needs `bookId` from the body.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/lib/quota.spec.ts src/routes/readingRuns.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/quota.ts apps/api/src/lib/quota.spec.ts apps/api/src/routes/readingRuns.ts
git commit -m "feat(api): enforce a per-book reading run quota"
```

---

### Task 6: Sessions-per-user and sessions-per-run quotas

**Files:**

- Modify: `apps/api/src/lib/quota.ts`
- Modify: `apps/api/src/lib/quota.spec.ts`
- Modify: `apps/api/src/routes/readingSessions.ts` (the `readingSessions.post("/")` handler)

**Interfaces:**

- Consumes: `QUOTAS` from `../lib/limits.ts`.
- Produces: `assertSessionQuota(userId: string, runId: string): Promise<void>` — checks the per-user total _and_ the per-run total.

**Placement warning:** the existing handler wraps its writes in `db.transaction()` inside a `try`, whose `catch` converts **every** error into a 404 (`readingSessions.ts:100-103`). A 403 thrown inside that block would surface as a 404. The quota check therefore goes **before** the `try`.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/lib/quota.spec.ts`:

```ts
describe("session quota", () => {
  const sessionBody = (runId: string) => ({
    id: uuidv7(),
    runId,
    startPage: 1,
    endPage: 10,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    readTime: 600,
  });

  it("rejects a new session once the per-run ceiling is reached", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 300 });
    const run = await makeRun({ userId: user.id, bookId: book.id });

    await db
      .insertInto("readingSession")
      .values(
        Array.from({ length: QUOTAS.sessionsPerRun }, () => ({
          id: uuidv7(),
          userId: user.id,
          runId: run.id,
          startPage: 1,
          endPage: 10,
          readPages: 9,
          startTime: new Date(),
          endTime: new Date(),
          readTime: 600,
        })),
      )
      .execute();

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: sessionBody(run.id),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("session limit reached");
  });

  it("rejects a new session once the per-user ceiling is reached, even on a fresh run", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 300 });
    const filler = await makeRun({ userId: user.id, bookId: book.id });
    const fresh = await makeRun({ userId: user.id, bookId: book.id });

    await db
      .insertInto("readingSession")
      .values(
        Array.from({ length: QUOTAS.sessionsPerUser }, () => ({
          id: uuidv7(),
          userId: user.id,
          runId: filler.id,
          startPage: 1,
          endPage: 10,
          readPages: 9,
          startTime: new Date(),
          endTime: new Date(),
          readTime: 600,
        })),
      )
      .execute();

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: sessionBody(fresh.id),
    });

    expect(response.status).toBe(403);
  });

  it("allows a session below both ceilings", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 300 });
    const run = await makeRun({ userId: user.id, bookId: book.id });

    const response = await call("POST", "/api/reading-sessions", {
      as: user,
      body: sessionBody(run.id),
    });

    expect(response.status).toBe(201);
  });
});
```

The second test is the important one: it seeds the per-user ceiling on one run and then writes to a _different_ run. A per-user total wrongly derived from the per-run limit would let it through.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --cwd apps/api run test src/lib/quota.spec.ts -t "session quota"`
Expected: FAIL — `assertSessionQuota` is not exported.

- [ ] **Step 3: Add the assertion**

Append to `apps/api/src/lib/quota.ts`:

```ts
async function countSessions(userId: string, runId?: string): Promise<number> {
  let query = db
    .selectFrom("readingSession")
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .where("userId", "=", userId);

  if (runId !== undefined) {
    query = query.where("runId", "=", runId);
  }

  const row = await query.executeTakeFirst();
  return Number(row?.total ?? 0);
}

/**
 * Both ceilings, checked independently. The per-user total is the real bound —
 * 1_000 books x 5 runs x 100 sessions is 500_000, far above it — so it must
 * never be derived from the per-run limit. The per-run check exists to catch a
 * runaway client loop early with a specific message.
 */
export async function assertSessionQuota(
  userId: string,
  runId: string,
): Promise<void> {
  const [total, perRun] = await Promise.all([
    countSessions(userId),
    countSessions(userId, runId),
  ]);

  if (total >= QUOTAS.sessionsPerUser) {
    throw new HTTPException(403, {
      message: `Reading session limit reached (${QUOTAS.sessionsPerUser}).`,
    });
  }

  if (perRun >= QUOTAS.sessionsPerRun) {
    throw new HTTPException(403, {
      message: `Reading session limit reached for this run (${QUOTAS.sessionsPerRun}).`,
    });
  }
}
```

Both messages contain the substring `session limit reached`, which is what the per-run test asserts on.

- [ ] **Step 4: Call it from the create-session handler**

In `apps/api/src/routes/readingSessions.ts`, add the import:

```ts
import { assertSessionQuota } from "../lib/quota.ts";
```

Then place the call after the `totalPages` lookup and the `endPage` check, but **before** the `try` block:

```ts
    if (request.endPage > totalPages) {
      throw new HTTPException(400, { message: "Incorrect end page" });
    }

    // Before the try: its catch turns every error into a 404, which would
    // mask this 403.
    await assertSessionQuota(userId, request.runId);

    try {
      const result = await db.transaction().execute(async (trx) => {
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/lib/quota.spec.ts src/routes/readingSessions.spec.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite, lint, typecheck, format, commit**

```bash
bun --cwd apps/api run test
bun turbo run lint typecheck --filter=api
bun run fmt
git add apps/api/src/lib/quota.ts apps/api/src/lib/quota.spec.ts apps/api/src/routes/readingSessions.ts
git commit -m "feat(api): enforce per-user and per-run reading session quotas"
```

---

### Task 7: Auth-path account policy

The layer that closes the actual 30GB vector. `user.name` is written by `POST /api/auth/sign-up/email` before verification, with no session and no route-level quota in reach.

**Files:**

- Create: `apps/api/src/lib/disposableDomains.ts`
- Create: `apps/api/src/lib/accountPolicy.ts`
- Create: `apps/api/src/lib/accountPolicy.spec.ts`
- Modify: `apps/api/src/lib/auth.ts`
- Modify: `apps/web/src/components/register-form.tsx:32-36`
- Test: `apps/web/src/components/register-form.spec.tsx`

**Interfaces:**

- Consumes: `FIELD_LIMITS` from `./limits.ts`.
- Produces: from `./accountPolicy.ts` —
  - `emailDomain(email: string): string`
  - `isDisposableEmailDomain(email: string): boolean`
  - `isNameWithinLimit(name: string): boolean`
  - `truncateUserAgent(ua: string | null | undefined): string | null`

- [ ] **Step 1: Create the blocklist data**

`apps/api/src/lib/disposableDomains.ts`:

```ts
/**
 * Disposable-inbox providers refused at signup.
 *
 * Defense in depth, explicitly not the fix. Operators rotate domains, and an
 * adversary already paying to solve Turnstile will rotate around any list. The
 * byte caps and quotas are what actually bound the damage; this only raises the
 * cost of the current wave.
 *
 * `kolsea.com` is the domain observed in the August 2026 campaign.
 *
 * Upgrade path: swap this for the `disposable-email-domains` package (~3.5k
 * entries, data-only) if the hand-maintained list proves too leaky.
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "kolsea.com",
  "10minutemail.com",
  "dispostable.com",
  "guerrillamail.com",
  "mailinator.com",
  "maildrop.cc",
  "yopmail.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "mailnesia.com",
  "fakeinbox.com",
  "mohmal.com",
  "moakt.com",
  "tempr.email",
  "emailondeck.com",
  "spam4.me",
]);
```

- [ ] **Step 2: Write the failing tests**

`apps/api/src/lib/accountPolicy.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  emailDomain,
  isDisposableEmailDomain,
  isNameWithinLimit,
  truncateUserAgent,
} from "./accountPolicy";
import { FIELD_LIMITS } from "./limits";

describe("emailDomain", () => {
  it("extracts the domain", () => {
    expect(emailDomain("someone@example.com")).toBe("example.com");
  });

  it("lowercases and trims", () => {
    expect(emailDomain("  Someone@Example.COM  ")).toBe("example.com");
  });

  it("uses the last @ so quoted local parts do not fool it", () => {
    expect(emailDomain('"weird@thing"@example.com')).toBe("example.com");
  });
});

describe("isDisposableEmailDomain", () => {
  it("blocks the domain observed in the attack", () => {
    expect(isDisposableEmailDomain("sifafo9462@kolsea.com")).toBe(true);
  });

  it("blocks regardless of case", () => {
    expect(isDisposableEmailDomain("bot@KOLSEA.COM")).toBe(true);
  });

  it("allows ordinary providers", () => {
    expect(isDisposableEmailDomain("real.person@gmail.com")).toBe(false);
    expect(isDisposableEmailDomain("real.person@proton.me")).toBe(false);
    expect(isDisposableEmailDomain("real.person@fastmail.com")).toBe(false);
  });

  it("does not block a subdomain lookalike it has no entry for", () => {
    expect(isDisposableEmailDomain("bot@mail.kolsea.com")).toBe(false);
  });
});

describe("isNameWithinLimit", () => {
  it("accepts a name at the limit", () => {
    expect(isNameWithinLimit("x".repeat(FIELD_LIMITS.userName))).toBe(true);
  });

  it("rejects a name one over the limit", () => {
    expect(isNameWithinLimit("x".repeat(FIELD_LIMITS.userName + 1))).toBe(
      false,
    );
  });

  it("rejects the multi-megabyte name used to fill the database", () => {
    expect(isNameWithinLimit("x".repeat(10_000_000))).toBe(false);
  });
});

describe("truncateUserAgent", () => {
  it("passes a normal user agent through unchanged", () => {
    const ua = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36";
    expect(truncateUserAgent(ua)).toBe(ua);
  });

  it("truncates rather than rejecting an oversized header", () => {
    const result = truncateUserAgent("x".repeat(10_000));
    expect(result).toHaveLength(FIELD_LIMITS.userAgent);
  });

  it("maps null and undefined to null", () => {
    expect(truncateUserAgent(null)).toBeNull();
    expect(truncateUserAgent(undefined)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun --cwd apps/api run test src/lib/accountPolicy.spec.ts`
Expected: FAIL — cannot resolve `./accountPolicy`.

- [ ] **Step 4: Implement the policy module**

`apps/api/src/lib/accountPolicy.ts`:

```ts
import { DISPOSABLE_EMAIL_DOMAINS } from "./disposableDomains.ts";
import { FIELD_LIMITS } from "./limits.ts";

/** The part after the final `@`, normalised for comparison. */
export function emailDomain(email: string): string {
  return email
    .slice(email.lastIndexOf("@") + 1)
    .trim()
    .toLowerCase();
}

export function isDisposableEmailDomain(email: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.has(emailDomain(email));
}

export function isNameWithinLimit(name: string): boolean {
  return name.length <= FIELD_LIMITS.userName;
}

/**
 * `session.userAgent` is unbounded `text` fed straight from a request header.
 * Truncated rather than rejected: an odd UA is not a reason to fail a login.
 */
export function truncateUserAgent(
  ua: string | null | undefined,
): string | null {
  if (!ua) return null;
  return ua.length <= FIELD_LIMITS.userAgent
    ? ua
    : ua.slice(0, FIELD_LIMITS.userAgent);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/lib/accountPolicy.spec.ts`
Expected: PASS (16 assertions).

- [ ] **Step 6: Wire the hooks into `auth.ts`**

Add the imports at the top of `apps/api/src/lib/auth.ts`:

```ts
import { APIError } from "better-auth/api";
import {
  isDisposableEmailDomain,
  isNameWithinLimit,
  truncateUserAgent,
} from "./accountPolicy.ts";
```

Add a `databaseHooks` block to the `betterAuth({...})` options — put it next to `emailAndPassword`, before `socialProviders`:

```ts
  // The signup path writes `user` before verification, so no route-level quota
  // can see it. This is the only place these fields can be bounded.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isNameWithinLimit(user.name)) {
            throw new APIError("BAD_REQUEST", { message: "Name is too long" });
          }
          if (isDisposableEmailDomain(user.email)) {
            throw new APIError("BAD_REQUEST", {
              message: "This email provider is not supported",
            });
          }
          return { data: user };
        },
      },
    },
    session: {
      create: {
        before: async (session) => ({
          data: { ...session, userAgent: truncateUserAgent(session.userAgent) },
        }),
      },
    },
  },
```

**Verify against the installed better-auth (`^1.6.9`) before moving on:** the `APIError` import path, the `before` hook's return shape (`{ data }` vs a bare object), and whether `session.userAgent` is typed `string | null | undefined`. Adjust to whatever the installed types require — the pure functions do not change either way. Run `bun turbo run typecheck --filter=api` as the check.

- [ ] **Step 7: Confirm the hooks do not break the existing suite**

Run: `bun --cwd apps/api run test`
Expected: PASS. `test/setup.ts` replaces only `auth.api.getSession`, so these hooks are not exercised by `call()` — that is exactly why the logic lives in the unit-tested module.

- [ ] **Step 8: Add the client-side name cap for parity**

In `apps/web/src/components/register-form.tsx`, change `registerFormSchema`:

```ts
const registerFormSchema = z.object({
  name: z.string().trim().nonempty().max(128),
  email: z.email(),
  password: z.string().trim().nonempty().min(8).max(128),
});
```

This is a UX nicety only — it gives a field-level error instead of a server round-trip. It is **not** a security control: the bot posts directly to the API and never loads this bundle.

- [ ] **Step 9: Add the web test**

Add to `apps/web/src/components/register-form.spec.tsx`, following the interaction pattern already used in that file:

```ts
it("shows a validation error for a name over the limit", async () => {
  // Arrange/act using the same render + userEvent helpers as the
  // neighbouring tests in this file, entering "x".repeat(129) as the name
  // and submitting.
  // Assert: the form does not call authClient.signUp.email.
});
```

Read the surrounding tests first and mirror their exact render/`userEvent`/assertion style rather than introducing a new one.

- [ ] **Step 10: Run web tests, lint, typecheck, format, commit**

```bash
bun --cwd apps/web run test
bun turbo run lint typecheck --filter=api --filter=web
bun run fmt
git add apps/api/src/lib/ apps/web/src/components/register-form.tsx \
        apps/web/src/components/register-form.spec.tsx
git commit -m "fix(api): bound name, email domain, and user agent on the signup path"
```

---

### Task 8: Cover upload hardening and orphaned file cleanup

**Files:**

- Modify: `apps/api/src/routes/bookCovers.ts`
- Modify: `apps/api/src/routes/bookCovers.spec.ts`
- Modify: `apps/api/src/routes/books.ts` (the `books.delete("/:bookId")` handler)
- Modify: `apps/api/src/routes/books.spec.ts`

**Interfaces:**

- Consumes: `BODY_LIMITS` from `../lib/limits.ts`.
- Produces: `ALLOWED_COVER_TYPES: ReadonlySet<string>` exported from `bookCovers.ts` for reuse in tests.

Three separate defects in this area:

1. No MIME check — any file is handed to `Bun.Image` three times.
2. `bookCovers.ts:37-38` `unlink`s the previous cover's two files with no error handling, so replacing a cover whose files are already gone throws ENOENT and 500s.
3. `books.delete("/:bookId")` removes the row but never unlinks its cover files, leaking them on `STORAGE_PATH` forever.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/routes/bookCovers.spec.ts`, following that file's existing `FormData` + PNG-fixture pattern (it already uses `test/helpers/png.ts`):

```ts
it("rejects a non-image upload with 400", async () => {
  const user = await makeUser();
  const book = await makeBook({ userId: user.id });

  const formData = new FormData();
  formData.append(
    "cover",
    new File(["#!/bin/sh\necho hi"], "payload.sh", {
      type: "text/x-shellscript",
    }),
  );

  const response = await call("POST", `/api/books/${book.id}/cover`, {
    as: user,
    formData,
  });

  expect(response.status).toBe(400);
});

it("replaces a cover whose files are already missing", async () => {
  const user = await makeUser();
  const book = await makeBook({ userId: user.id, coverId: "stale-cover-id" });

  // No files were ever written for "stale-cover-id" — the unlink must not throw.
  const formData = new FormData();
  formData.append("cover", makeCoverFile());

  const response = await call("POST", `/api/books/${book.id}/cover`, {
    as: user,
    formData,
  });

  expect(response.status).toBe(201);
});
```

`makeCoverFile()` stands for whatever the existing spec already uses to build a valid PNG `File`; reuse that helper rather than adding another.

Add to `apps/api/src/routes/books.spec.ts`:

```ts
it("removes the cover files when the book is deleted", async () => {
  const user = await makeUser();
  const book = await makeBook({ userId: user.id });

  const formData = new FormData();
  formData.append("cover", makeCoverFile());
  const upload = await call("POST", `/api/books/${book.id}/cover`, {
    as: user,
    formData,
  });
  const { coverId } = (await upload.json()) as { coverId: string };

  const coversDir = join(process.env.STORAGE_PATH!, "covers");
  expect(existsSync(join(coversDir, `${coverId}-sm.webp`))).toBe(true);

  const response = await call("DELETE", `/api/books/${book.id}`, { as: user });
  expect(response.status).toBe(204);

  expect(existsSync(join(coversDir, `${coverId}-sm.webp`))).toBe(false);
  expect(existsSync(join(coversDir, `${coverId}-md.webp`))).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun --cwd apps/api run test src/routes/bookCovers.spec.ts src/routes/books.spec.ts`
Expected: FAIL — the shell script uploads successfully, the stale-cover replace 500s, and the cover files survive deletion.

- [ ] **Step 3: Add the MIME allowlist and the size backstop**

In `apps/api/src/routes/bookCovers.ts`, add the import and the allowlist:

```ts
import { BODY_LIMITS } from "../lib/limits.ts";

export const ALLOWED_COVER_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
```

Then replace the file-validation block:

```ts
const file = body["cover"];

if (!(file instanceof File)) {
  throw new HTTPException(400, {
    message: "No file uploaded or invalid format",
  });
}

if (!ALLOWED_COVER_TYPES.has(file.type)) {
  throw new HTTPException(400, {
    message: "Cover must be a JPEG, PNG, WebP, AVIF, or GIF image",
  });
}

// Backstop to the body-limit middleware: multipart overhead means the
// envelope can pass while the part itself is larger than intended.
if (file.size > BODY_LIMITS.upload) {
  throw new HTTPException(413, { message: "Cover image is too large" });
}
```

`file.type` is client-supplied and trivially spoofed, so this is a cheap filter, not a guarantee — `Bun.Image` still rejects anything it cannot decode. Note also that the handler decodes the same file **three times** (`extractAverageColor` plus two `resizeToWebP` calls), which triples the cost of a decompression bomb. Capping decoded pixel dimensions is the real defense; check whether the installed Bun exposes image metadata before decode. If it does, reject anything above 10_000 x 10_000. If it does not, leave a comment recording that file size is the only available guard so the next reader does not assume otherwise.

- [ ] **Step 4: Make the stale-cover unlink safe**

Extract a helper in `apps/api/src/routes/bookCovers.ts` and use it in both places that delete cover files:

```ts
/** Cover files can already be gone (manual cleanup, failed write, restore). */
async function removeCoverFiles(coverId: string): Promise<void> {
  await Promise.all([
    unlink(`${basePath}/covers/${coverId}-sm.webp`).catch(() => {}),
    unlink(`${basePath}/covers/${coverId}-md.webp`).catch(() => {}),
  ]);
}
```

Replace the two-line unlink in the POST handler:

```ts
if (found.coverId) {
  await removeCoverFiles(found.coverId);
}
```

And in the DELETE handler, replace its two `unlink` calls with:

```ts
await removeCoverFiles(found.coverId);
```

- [ ] **Step 5: Unlink cover files when a book is deleted**

In `apps/api/src/routes/books.ts`, the delete handler currently discards the row. Read `coverId` first, then remove the files after a successful delete:

```ts
books.delete("/:bookId", zValidator("param", bookSchema), async (c) => {
  const userId = c.get("user")!.id;
  const bookId = c.req.valid("param").bookId;

  const deleteBookQuery = db
    .deleteFrom("book")
    .where("id", "=", bookId)
    .where("userId", "=", userId)
    .returning("coverId");

  const result = await deleteBookQuery.executeTakeFirst();

  if (!result) {
    throw new HTTPException(404, { message: "Book not found" });
  }

  if (result.coverId) {
    await removeCoverFiles(result.coverId);
  }

  return c.body(null, 204);
});
```

`.returning("coverId")` replaces the `numDeletedRows` check: a `returning` delete yields a row only when something was deleted, so `!result` is the equivalent not-found test.

`removeCoverFiles` must now be shared. Move it to a new `apps/api/src/lib/covers.ts` exporting `removeCoverFiles(coverId: string): Promise<void>` (reading `STORAGE_PATH` the same way `bookCovers.ts` does), and import it in both routes. Do not duplicate the function.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/routes/bookCovers.spec.ts src/routes/books.spec.ts`
Expected: PASS.

- [ ] **Step 7: Run the full suite, lint, typecheck, format, commit**

```bash
bun --cwd apps/api run test
bun turbo run lint typecheck --filter=api
bun run fmt
git add apps/api/src/routes/bookCovers.ts apps/api/src/routes/bookCovers.spec.ts \
        apps/api/src/routes/books.ts apps/api/src/routes/books.spec.ts \
        apps/api/src/lib/covers.ts
git commit -m "fix(api): validate cover uploads and stop leaking cover files"
```

---

### Task 9: Cleanup scripts

The code changes stop new damage; these reclaim what is already there. Both are one-off operational scripts, run manually against production.

**Files:**

- Create: `apps/api/scripts/purge-bot-accounts.ts`
- Create: `apps/api/scripts/sweep-orphan-covers.ts`
- Modify: `apps/api/package.json` (add two scripts)
- Modify: `apps/api/README.md` (document both)

**Interfaces:**

- Consumes: `db` from `../src/lib/database.ts`, `isDisposableEmailDomain` and `isNameWithinLimit` from `../src/lib/accountPolicy.ts`, `FIELD_LIMITS` from `../src/lib/limits.ts`.
- Produces: nothing importable.

A purge script was removed in `34f6d33`; this replaces it with a narrower one.

- [ ] **Step 1: Write the purge script**

`apps/api/scripts/purge-bot-accounts.ts`:

```ts
/**
 * Deletes accounts matching the August 2026 bot campaign and reports what went.
 *
 * Every FK to `user.id` is ON DELETE CASCADE, so `book`, `readingRun`,
 * `readingSession`, `goal`, `session`, and `account` rows follow automatically.
 *
 * Run with `--apply` to actually delete; the default is a dry run.
 *
 * NOTE: DELETE only marks tuples dead. It will NOT shrink the 30GB on disk.
 * Follow up with `VACUUM FULL` (exclusive lock, needs a maintenance window) or
 * pg_repack (online). See the README.
 */
import { db } from "../src/lib/database.ts";
import {
  isDisposableEmailDomain,
  isNameWithinLimit,
} from "../src/lib/accountPolicy.ts";

const apply = process.argv.includes("--apply");

const candidates = await db
  .selectFrom("user")
  .select(["id", "email", "name", "emailVerified", "createdAt"])
  .execute();

const doomed = candidates.filter(
  (u) => isDisposableEmailDomain(u.email) || !isNameWithinLimit(u.name),
);

console.log(`scanned ${candidates.length} users, matched ${doomed.length}`);
for (const u of doomed) {
  console.log(
    `  ${u.id}  ${u.email}  nameLen=${u.name.length}  verified=${u.emailVerified}`,
  );
}

if (!apply) {
  console.log("\ndry run — pass --apply to delete");
  process.exit(0);
}

if (doomed.length > 0) {
  const { numDeletedRows } = await db
    .deleteFrom("user")
    .where(
      "id",
      "in",
      doomed.map((u) => u.id),
    )
    .executeTakeFirst();

  console.log(`\ndeleted ${numDeletedRows} users (children cascaded)`);
}

await db.destroy();
```

**Deliberately not matched: `emailVerified = false` alone.** A real person who signed up and has not clicked the link yet would be caught by that, and the whole point of this exercise is not to punish real users for the bots' behaviour. The two criteria used here — a blocklisted domain, or a name longer than the new cap — are both things only the attack produces.

- [ ] **Step 2: Write the orphan-cover sweep**

`apps/api/scripts/sweep-orphan-covers.ts`:

```ts
/**
 * Removes WebP files under STORAGE_PATH/covers with no matching book.coverId.
 *
 * These accumulate because, before this change, deleting a book removed the row
 * and left its files behind. Run with `--apply`; the default is a dry run.
 */
import { readdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../src/lib/database.ts";

const apply = process.argv.includes("--apply");
const basePath = process.env.STORAGE_PATH;

if (!basePath) throw new Error("STORAGE_PATH is missing");

const coversDir = join(basePath, "covers");

const rows = await db
  .selectFrom("book")
  .select("coverId")
  .where("coverId", "is not", null)
  .execute();

const live = new Set(rows.map((r) => r.coverId));

const files = await readdir(coversDir);
let bytes = 0;
const orphans: string[] = [];

for (const file of files) {
  // Filenames are `${coverId}-sm.webp` / `${coverId}-md.webp`.
  const coverId = file.replace(/-(sm|md)\.webp$/, "");
  if (coverId === file) continue; // not a cover variant; leave it alone
  if (live.has(coverId)) continue;

  orphans.push(file);
  bytes += (await stat(join(coversDir, file))).size;
}

console.log(
  `${files.length} files, ${orphans.length} orphaned, ${(bytes / 1_048_576).toFixed(1)} MiB reclaimable`,
);

if (!apply) {
  console.log("dry run — pass --apply to delete");
} else {
  await Promise.all(orphans.map((f) => unlink(join(coversDir, f))));
  console.log(`deleted ${orphans.length} files`);
}

await db.destroy();
```

- [ ] **Step 3: Add the package scripts**

In `apps/api/package.json`, add to `"scripts"`:

```json
"purge:bots": "bun run scripts/purge-bot-accounts.ts",
"sweep:covers": "bun run scripts/sweep-orphan-covers.ts"
```

- [ ] **Step 4: Verify both dry runs against a local database**

```bash
bun run dev:deps:up
cd apps/api && bun run db:migrate && bun run purge:bots && bun run sweep:covers
```

Expected: both report `0 matched` / `0 orphaned` on a clean database and exit 0. Confirm neither deletes anything without `--apply`.

- [ ] **Step 5: Document the reclaim step in the README**

Add a section to `apps/api/README.md`:

```markdown
## Reclaiming disk after an abuse incident

1. `bun run purge:bots` — dry run; review the matched accounts.
2. `bun run purge:bots -- --apply` — delete them. Children cascade.
3. `bun run sweep:covers -- --apply` — remove orphaned cover files.
4. **`DELETE` does not return disk to the OS.** Run `VACUUM FULL ANALYZE`
   (takes an exclusive lock — needs a maintenance window) or `pg_repack`
   (online, needs the extension) before the space reappears.
```

Step 4 is the one people miss: without it the 30GB stays allocated and the incident looks unresolved.

- [ ] **Step 6: Lint, format, commit**

```bash
bun turbo run lint typecheck --filter=api
bun run fmt
git add apps/api/scripts/ apps/api/package.json apps/api/README.md
git commit -m "chore(api): add bot-account purge and orphan-cover sweep scripts"
```

---

### Task 10: Per-user write rate limiting

Quotas cap how much an account can ever store; this caps how fast. **100 writes per hour per user**, counted in Dragonfly, applied to `POST`/`PUT`/`PATCH`/`DELETE`.

Sizing rationale: adding one book with a cover and logging three sessions is 6 writes, so 100/hour leaves room for a real evening of use — including logging a weekend backlog. A bot is held to 2,400 writes/day, which against the 5,000-session quota means roughly two days of sustained hammering to max a single account.

**Files:**

- Modify: `apps/api/src/lib/limits.ts`
- Create: `apps/api/src/middlewares/writeRateLimit.ts`
- Create: `apps/api/src/middlewares/writeRateLimit.spec.ts`
- Modify: `apps/api/test/mocks/redis.ts` (add `incr` / `expire` / `ttl`)
- Modify: `apps/api/src/app.ts`

**Interfaces:**

- Consumes: `redisClient` from `../lib/redis.ts`; `RATE_LIMITS` from `../lib/limits.ts`.
- Produces: `writeRateLimit(): MiddlewareHandler` and `WRITE_METHODS: ReadonlySet<string>` from `../middlewares/writeRateLimit.ts`.

- [ ] **Step 1: Add the constants**

Append to `apps/api/src/lib/limits.ts`:

```ts
/**
 * Velocity ceiling per user, distinct from QUOTAS (which bound totals).
 *
 * A bot held to this still cannot exceed its QUOTAS, so this exists to stop
 * CPU and connection burn rather than data volume — which is why it can afford
 * to be generous. 6 writes covers adding one book with a cover and logging
 * three sessions.
 */
export const RATE_LIMITS = {
  writesPerWindow: 100,
  windowSeconds: 60 * 60,
} as const;
```

- [ ] **Step 2: Extend the Redis mock**

The existing mock in `apps/api/test/mocks/redis.ts` has `eval` but no counter commands. Add them to the `redisMock` object, alongside the existing methods:

```ts
  async incr(key: string) {
    const next = Number(store.get(key) ?? "0") + 1;
    store.set(key, String(next));
    return next;
  },
  async expire(key: string, _seconds: number) {
    return store.has(key) ? 1 : 0;
  },
  async ttl(key: string) {
    return store.has(key) ? 3_600 : -2;
  },
```

Also add a `multi()` that supports the chained `incr(...).expire(...).exec()` shape the middleware uses:

```ts
  multi() {
    const ops: Array<() => Promise<unknown>> = [];
    const chain = {
      incr(key: string) {
        ops.push(() => redisMock.incr(key));
        return chain;
      },
      expire(key: string, seconds: number) {
        ops.push(() => redisMock.expire(key, seconds));
        return chain;
      },
      async exec() {
        const out: Array<[Error | null, unknown]> = [];
        for (const op of ops) out.push([null, await op()]);
        return out;
      },
    };
    return chain;
  },
```

`store` is module-level and shared, but `test/setup.ts` does not clear it between tests. **Export a reset and call it in `beforeEach`**, otherwise counters leak across tests and the rate-limit specs will fail depending on execution order. Add to `apps/api/test/mocks/redis.ts`:

```ts
export function resetRedisMock(): void {
  store.clear();
}
```

And in `apps/api/test/setup.ts`, import it and call it inside the existing `beforeEach`, beside `queueAddMock.mockClear()`:

```ts
import { resetRedisMock } from "./mocks/redis"; // add beside the existing imports

beforeEach(async () => {
  setAuthenticatedUser(null);
  queueAddMock.mockClear();
  resetRedisMock();
  await truncateAll(db);
});
```

This is a prerequisite, not an optional tidy-up. Without it, every test that performs a write consumes budget that later tests inherit.

- [ ] **Step 3: Write the failing tests**

`apps/api/src/middlewares/writeRateLimit.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { call } from "../../test/helpers/request";
import { makeUser, makeBook } from "../../test/helpers/factories";
import { RATE_LIMITS } from "../lib/limits";
import { WRITE_METHODS } from "./writeRateLimit";

describe("WRITE_METHODS", () => {
  it("covers the mutating verbs and nothing else", () => {
    expect([...WRITE_METHODS].sort()).toEqual([
      "DELETE",
      "PATCH",
      "POST",
      "PUT",
    ]);
  });
});

describe("write rate limit", () => {
  it("allows reads without consuming budget", async () => {
    const user = await makeUser();

    for (let i = 0; i < RATE_LIMITS.writesPerWindow + 5; i++) {
      const response = await call("GET", "/api/books", { as: user });
      expect(response.status).toBe(200);
    }
  });

  it("rejects the write past the hourly ceiling with 429", async () => {
    const user = await makeUser();

    for (let i = 0; i < RATE_LIMITS.writesPerWindow; i++) {
      const response = await call("POST", "/api/books", {
        as: user,
        body: { id: uuidv7(), title: `Book ${i}`, totalPages: 300 },
      });
      expect(response.status).toBe(201);
    }

    const blocked = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "One too many", totalPages: 300 },
    });

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    const body = (await blocked.json()) as { message: string };
    expect(body.message).toContain("Too many");
  });

  it("counts each user separately", async () => {
    const [user, other] = await Promise.all([makeUser(), makeUser()]);

    for (let i = 0; i < RATE_LIMITS.writesPerWindow; i++) {
      await call("POST", "/api/books", {
        as: other,
        body: { id: uuidv7(), title: `Book ${i}`, totalPages: 300 },
      });
    }

    const response = await call("POST", "/api/books", {
      as: user,
      body: { id: uuidv7(), title: "Mine", totalPages: 300 },
    });

    expect(response.status).toBe(201);
  });

  it("counts DELETE against the ceiling", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });

    for (let i = 0; i < RATE_LIMITS.writesPerWindow; i++) {
      await call("POST", "/api/books", {
        as: user,
        body: { id: uuidv7(), title: `Book ${i}`, totalPages: 300 },
      });
    }

    const response = await call("DELETE", `/api/books/${book.id}`, {
      as: user,
    });
    expect(response.status).toBe(429);
  });
});
```

The "counts each user separately" test is the one that catches a limiter keyed on something global instead of `userId` — the same failure mode as the book quota.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `bun --cwd apps/api run test src/middlewares/writeRateLimit.spec.ts`
Expected: FAIL — cannot resolve `./writeRateLimit`.

- [ ] **Step 5: Implement the middleware**

`apps/api/src/middlewares/writeRateLimit.ts`:

```ts
import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types.ts";
import { redisClient } from "../lib/redis.ts";
import { RATE_LIMITS } from "../lib/limits.ts";

export const WRITE_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

const WINDOW_MS = RATE_LIMITS.windowSeconds * 1_000;

/**
 * Fixed-window write limiter, keyed per user.
 *
 * The window index is part of the key, so the counter dies on its own and
 * re-setting the TTL on every request is harmless — which keeps this to one
 * round trip without relying on `EXPIRE NX` (Redis 7+, and not guaranteed on
 * Dragonfly).
 *
 * Fails open: if Dragonfly is unreachable, the write proceeds. The per-user
 * QUOTAS still bound total damage, so a cache outage should not take writes
 * down with it.
 */
export const writeRateLimit = (): MiddlewareHandler =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!WRITE_METHODS.has(c.req.method)) return next();

    const userId = c.get("user")?.id;
    if (!userId) return next(); // requireAuth already rejected, or will

    const window = Math.floor(Date.now() / WINDOW_MS);
    const key = `readometer-write-rate:${userId}:${window}`;

    let count: number;
    try {
      const results = await redisClient
        .multi()
        .incr(key)
        .expire(key, RATE_LIMITS.windowSeconds)
        .exec();

      count = Number(results?.[0]?.[1] ?? 0);
    } catch (error) {
      console.error("write rate limit unavailable, failing open", error);
      return next();
    }

    if (count > RATE_LIMITS.writesPerWindow) {
      const retryAfter = Math.ceil(
        ((window + 1) * WINDOW_MS - Date.now()) / 1_000,
      );
      c.header("Retry-After", String(retryAfter));
      throw new HTTPException(429, {
        message: `Too many writes. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      });
    }

    return next();
  });
```

Note `count > writesPerWindow`, not `>=`: `INCR` returns the count _including_ the current request, so the 100th write returns 100 and must be allowed.

`HTTPException` thrown from middleware loses headers set via `c.header()` in some Hono versions. If the `retry-after` assertion in Step 3 fails, return the response directly instead of throwing:

```ts
return c.json(
  {
    message: `Too many writes. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
  },
  429,
  { "Retry-After": String(retryAfter) },
);
```

- [ ] **Step 6: Register it in `app.ts`**

Add the import beside the other middleware imports:

```ts
import { writeRateLimit } from "./middlewares/writeRateLimit.ts";
```

Register it immediately after `requireAuth()`, so `c.get("user")` is populated and `/auth/*` (which has better-auth's own `rateLimit`) is untouched:

```ts
app.use("*", requireAuth());
app.use("*", writeRateLimit());

app.route("/me", me);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun --cwd apps/api run test src/middlewares/writeRateLimit.spec.ts`
Expected: PASS.

- [ ] **Step 8: Run the full suite and watch for budget exhaustion**

Run: `bun --cwd apps/api run test`

Expected: PASS. If specs begin failing with 429, `resetRedisMock()` is not wired into `beforeEach` (Step 2) — the quota specs in Tasks 4-6 seed hundreds of rows and would otherwise burn through the window. Note those specs seed via `db.insertInto(...)` directly rather than over HTTP, which is precisely why they do not consume rate-limit budget; keep it that way.

- [ ] **Step 9: Document the limit**

Add a row to the endpoint table in `apps/api/README.md` noting that all `POST`/`PUT`/`PATCH`/`DELETE` routes share a per-user ceiling of 100 requests per hour, returning 429 with `Retry-After`.

- [ ] **Step 10: Lint, typecheck, format, commit**

```bash
bun turbo run lint typecheck --filter=api
bun run fmt
git add apps/api/src/lib/limits.ts apps/api/src/middlewares/writeRateLimit.ts \
        apps/api/src/middlewares/writeRateLimit.spec.ts apps/api/src/app.ts \
        apps/api/test/mocks/redis.ts apps/api/test/setup.ts apps/api/README.md
git commit -m "feat(api): rate limit writes to 100 per hour per user"
```

---

## Verification before opening the PR

- [ ] `bun --cwd apps/api run test` — full suite green
- [ ] `bun --cwd apps/web run test` — full suite green
- [ ] `bun turbo run lint typecheck` — clean across the repo, zero warnings
- [ ] `bun run fmt:check` — clean
- [ ] Manually confirm the primary vector is closed against a local server:

```bash
# Expect 413, not 200.
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  http://localhost:3000/api/auth/sign-up/email -H 'Content-Type: application/json' \
  --data-binary @<(python3 -c '
import json; print(json.dumps({"name":"A"*10_000_000,
  "email":"probe@example.com","password":"correct horse battery"}))')

# Expect 400 with "not supported", not 200.
curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bot","email":"sifafo9462@kolsea.com","password":"correct horse battery"}'
```

```bash
# Expect the 101st write in an hour to return 429.
for i in $(seq 1 101); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:3000/api/books \
    -H 'Content-Type: application/json' -b cookies.txt \
    -d "{\"id\":\"$(uuidgen | tr 'A-Z' 'a-z')\",\"title\":\"probe $i\",\"totalPages\":300}"
done; echo
```

The first curl is the regression test for the actual incident. If it returns anything other than 413, the middleware is registered in the wrong place. The loop needs a real session cookie in `cookies.txt`; expect a hundred `201`s then `429`.

## Deferred — deliberately not in this PR

Recorded in the spec's "Out of scope"; each needs its own plan.

- **`varchar(n)` and CHECK constraints on the `text` columns.** The strongest guarantee, since it holds regardless of which code path writes, but it needs a migration over currently-polluted tables — so it must follow Task 9's cleanup. Per CLAUDE.md, DDL and backfill go in separate files scaffolded with `bun run db:migrate make <name>`.
- **Monitoring on database growth.** Nothing alerts today, which is why 30GB was found by its effects rather than by a page.
- **Expired `verification` row cleanup**, not configured in `auth.ts`; every signup leaves a permanent row.
