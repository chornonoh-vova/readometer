# CI/CD: one pipeline, OIDC remote cache, cache parity — Implementation Plan

**Goal:** Merge `ci.yaml` + `cd.yaml` into one pipeline (barklog's `verify` + `images`
shape), replace the long-lived `TURBO_TOKEN` with
`vercel/setup-turborepo-remote-cache-action` (GitHub OIDC → short-lived Vercel token),
and make every turbo task that CI computes reusable by the image builds and by later
runs.

**Reference:** `../barklog/.github/workflows/{verify,images,publish-image}.yml`,
`../barklog/docs/adr/0008-turborepo-remote-cache.md`.

---

## Outcome (implemented 2026-11-12)

Decisions: bun **1.4.4** everywhere (D1); **amd64 only**, with `dev.compose.yaml`'s built
services pinned to `linux/amd64` (D2); `fmt:check` not added (D3). The Vercel OIDC policy
already covers this repo.

Where the implementation departs from the plan below:

- **Parallelism.** `verify.yaml` runs two jobs side by side (`Checks`: lint, typecheck,
  build; `Test`). `images.yaml` adds a `prime` stage that runs _beside_ verify: it builds
  api/notifications fully and web up to its `deps` stage without pushing and writes the
  layer cache, so `publish` (after verify) is cache hits plus a push. Shared setup lives in
  `.github/actions/setup`.
- **Hash parity needed a third fix.** Turbo's bun pruner re-hoists `bun.lock` when it
  drops packages, which changed `eslint-config`'s external-dependency hash, and through it
  `web#build`'s. `apps/web/Dockerfile` now prunes `web api notifications`; verified
  `web#build` hashes identically on the host and inside the amd64 builder.
- `build` also depends on `transit`, and `transit` itself excludes `*.md`/`sample.env`;
  otherwise the Docker-excluded READMEs leak back in through the transit hashes.
- `publish-image.yaml` declares no `permissions` (a callee asking for more than the
  caller grants fails to start), and passes BuildKit secrets only to web's push build.

## 1. What is wrong today

Ordered by how much cache they cost.

| #   | Problem                                                                                                                                                                                                                                            | Effect                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **CI builds `web` without `VITE_TURNSTILE_SITE_KEY`**; the image build sets it. It is in `build.env`, so the hashes differ.                                                                                                                        | The `web` image **never** hits what CI uploaded. Every image build runs `tsc -b && vite build` from scratch, and under QEMU a second time for arm64. |
| P2  | **`.dockerignore` drops `*.md` and `sample.env`**, but `build` hashes `$TURBO_DEFAULT$`, which includes the tracked `apps/web/{README,CLAUDE}.md` and `apps/web/sample.env`.                                                                       | Second, independent reason the Docker hash differs from CI's. Fixing P1 alone gains nothing.                                                         |
| P3  | **`TURBO_TOKEN` is a build arg turned into `ENV`** in `apps/web/Dockerfile`, and `cache-to: mode=max` exports that `builder` stage.                                                                                                                | The token sits in GHA layer-cache metadata and build history. Security bug: the token must be revoked, not just replaced.                            |
| P4  | **CD is a `workflow_run`**: a separate workflow, needs the `DEPLOY_SHA` workaround, and its jobs cannot share anything with CI's job.                                                                                                              | More moving parts; `workflow_run` runs from main's workflow file rather than the commit's.                                                           |
| P5  | **`lint`/`typecheck`/`test` depend on `^lint`/`^typecheck`/`^test`.** Packages are consumed from source, so nothing needs the upstream _task_ to run first; the edge exists only to carry the upstream hash.                                       | Tasks serialize along the package graph for no reason (api's tests wait for isbn's and notification-events' tests).                                  |
| P6  | **Toolchain drift.** `packageManager` and CI use bun `1.3.14`; api/notifications images use `oven/bun:1.4.3`; web uses floating `oven/bun:1`. The prune stage installs floating `turbo@^2`. Docker runs `bun install` without `--frozen-lockfile`. | Non-reproducible images; a different bun can rewrite `bun.lock` in the image, which changes package hashes and breaks parity again.                  |
| P7  | **No dependency cache.** `oven-sh/setup-bun` caches the binary, not `~/.bun/install/cache`.                                                                                                                                                        | Every verify run downloads every package.                                                                                                            |
| P8  | **PRs write to the remote cache.** Any same-repo branch can upload `dist/` that main's image build then replays.                                                                                                                                   | Cache poisoning surface; barklog's ADR-0008 write policy fixes this.                                                                                 |
| P9  | **arm64 is built under QEMU.** Every `RUN` in the arm64 leg is emulated (bun install, turbo prune, vite build).                                                                                                                                    | The slowest part of CD. Repo is public, so native `ubuntu-24.04-arm` runners are free.                                                               |

## 2. Target design

### Workflows (mirrors barklog)

```
.github/workflows/
  verify.yaml         on: pull_request, workflow_call    — the checks, one definition
  images.yaml         on: push(main), workflow_dispatch  — verify → publish (matrix)
  publish-image.yaml  on: workflow_call                  — how one image is built
```

`ci.yaml` and `cd.yaml` are deleted. On main, `images.yaml` calls `verify.yaml` and the
publish jobs `needs: verify`, so main cannot publish what a PR would have failed, and
there is no `workflow_run` / `DEPLOY_SHA` indirection (`github.sha` _is_ the commit).

```
images.yaml (push main)
 └─ verify ──► publish (matrix: api, web, notifications; fail-fast: false)
```

Unlike barklog, there is no publish ordering: the three images come from three
Dockerfiles with no shared stages, and migrations run from the api image itself. One
matrix job in parallel is correct; partial failure leaves tags at different commits,
exactly as today.

### Remote cache policy (barklog ADR-0008, adopted)

| Run                                  | Remote cache                                |
| ------------------------------------ | ------------------------------------------- |
| push to main (verify + image builds) | read/write                                  |
| `workflow_dispatch`                  | read/write                                  |
| same-repo PR (incl. Dependabot)      | read-only — `TURBO_CACHE=local:rw,remote:r` |
| fork PR                              | none (no OIDC token) — step skipped         |

- Every job that runs turbo gets `permissions: id-token: write` and runs the setup
  action **before** `bun install`.
- Image builds get `TURBO_TOKEN`/`TURBO_TEAM` as **BuildKit secrets** mounted on the
  `turbo run build` step only, never build args.
- Expected result on main: verify uploads `web#build`; the image build of the same commit
  gets `FULL TURBO` and only copies `dist/`. Both arm64 and amd64 legs hit the same entry
  (turbo's hash does not include the platform).

### Hash parity (CI ⇄ Docker)

A cache entry is reusable only if CI and the Docker builder compute the same task hash.
Three fixes, all required:

1. **Same env** — verify sets `VITE_TURNSTILE_SITE_KEY` from the existing secret (it is a
   public Turnstile key, baked into the bundle anyway). Fork PRs lack it; they don't write.
2. **Same files** — narrow `build.inputs` so docs and the sample env don't count:
   `["$TURBO_DEFAULT$", "!**/*.md", "!sample.env", ".env*"]`. Bonus: README edits stop
   invalidating the web build. `.dockerignore` stays as is. Rule to document: any file
   the Docker context excludes that matches a task's inputs breaks parity.
3. **Same lockfile/turbo** — `bun install --frozen-lockfile` in Docker, bun version
   pinned to `packageManager`, prune stage runs the lockfile's turbo version.

`turbo prune` does not change task hashes (barklog verified this), and `.git` being
absent in the context is fine: turbo falls back to hashing files while honoring
`.gitignore`.

### turbo.json

```jsonc
{
  "tasks": {
    "transit": { "dependsOn": ["^transit"] },
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md", "!sample.env", ".env*"],
      "outputs": ["dist/**", "*.tsbuildinfo"],
      "env": ["VITE_TURNSTILE_SITE_KEY"],
    },
    "typecheck": {
      "dependsOn": ["transit"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md"],
      "outputs": ["*.tsbuildinfo"],
    },
    "lint": {
      "dependsOn": ["transit"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md"],
    },
    "test": {
      "dependsOn": ["transit"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md"],
    },
    "dev": { "cache": false, "persistent": true },
  },
}
```

`transit` is Turborepo's documented pattern for "invalidate when a dependency's source
changes, but don't wait for its task": no package has a `transit` script, so it never
runs, yet its hash carries every upstream package's files (including `eslint-config` and
`typescript-config`) into the dependents' hashes. Dropping `^test` _without_ a transit
node would be a correctness bug — api's tests would cache-hit after an `isbn` change.

`test` stays cached, as today. api/notifications suites run Postgres/Redis via
Testcontainers; their hash is files + env only. That is the same trade-off already in
place, now stated explicitly in the docs.

## 3. Prerequisites (manual, outside the repo)

1. **Vercel → Team Settings → Security → OIDC / Turborepo CLI policy**: the policy that
   lets barklog trade its OIDC token must also allow `chornonoh-vova/readometer`. Without
   this, the setup step fails in every job.
2. Confirm repo variable `TURBO_TEAM` (exists: `volodymyr-chornonohs-projects`).
3. After the first green main run on the new pipeline:
   - **Revoke** the old Turbo token in Vercel (it leaked into GHA cache metadata — P3),
     then `gh secret delete TURBO_TOKEN`.
   - Purge the old layer caches holding it: `gh cache list --key buildkit` →
     `gh cache delete` for the `chornonoh-vova/readometer-web` scope (all three scopes is
     simplest; they rebuild once).

No required status checks are configured on the `main` ruleset, so renaming the check
from `CI / Verify` breaks nothing. If you want one, add `Verify / Checks` after this lands.

## 4. Tasks

Each task is one commit (Conventional Commits). Tasks 1–3 are safe to land on the old
workflows; task 4 switches over.

### Task 1 — `build(turbo): transit node and doc-insensitive inputs`

- `turbo.json` as in §2.
- Verify locally:
  - `bun turbo run lint typecheck test build --dry=json | jq '.tasks[]|{taskId,hash}'`
    — no `transit` task executes; dependents list `<pkg>#transit` in `dependencies`.
  - Touch `packages/isbn/src/index.ts` → `api#test`, `api#typecheck`, `api#lint`,
    `web#*` hashes change. Touch `apps/web/README.md` → no `web#*` hash changes.
  - `bun run lint && bun run typecheck && bun run test && bun run build` green.
  - Run twice: second run is `FULL TURBO`.

### Task 2 — `build(docker): pin toolchain, frozen installs, turbo secrets`

All three Dockerfiles:

- `# syntax=docker/dockerfile:1` header.
- Base image `oven/bun:<X>` where X equals `packageManager` (see Decision D1), pinned by
  digest like barklog (`oven/bun:1.x.y@sha256:…`); Dependabot's docker ecosystem bumps
  both.
- `ENV TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1` in `base`.
- Prune stage: `RUN bunx turbo@2.11.9 prune <app> --docker` (pinned; comment "keep in
  step with root package.json") instead of `bun add -g turbo@^2`.
- `RUN bun install --frozen-lockfile`.

`apps/web/Dockerfile` additionally — remove `ARG/ENV TURBO_*` and:

```dockerfile
RUN --mount=type=secret,id=site-key,env=VITE_TURNSTILE_SITE_KEY \
    --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    --mount=type=secret,id=turbo_team,env=TURBO_TEAM \
    bun turbo run build --filter=web --ui=stream
```

A local `docker build` without the secrets falls back to turbo's local cache, as before.
Verify: `docker build -f apps/web/Dockerfile --secret id=site-key,env=VITE_TURNSTILE_SITE_KEY .`
and the same for api/notifications; `docker compose -f dev.compose.yaml build` still works.

Keep `packageManager`, CI's bun, and the images on one version: change CI to
`bun-version-file: package.json` so only `packageManager` and the Dockerfile `FROM`s
need bumping (Dependabot handles the latter; add a comment pointing at the former).

### Task 3 — `ci: verify.yaml with OIDC remote cache`

New `.github/workflows/verify.yaml` (replaces `ci.yaml`'s job; `ci.yaml` deleted in
task 4 together with `cd.yaml` so main is never without CI):

```yaml
name: Verify
on:
  pull_request:
  workflow_call:
concurrency:
  group: verify-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
permissions:
  contents: read
  id-token: write
jobs:
  verify:
    name: Checks
    runs-on: ubuntu-latest
    env:
      # Public key, baked into the bundle. Set here so web#build hashes the same
      # as in apps/web/Dockerfile and the image build replays this run's output.
      VITE_TURNSTILE_SITE_KEY: ${{ secrets.TURNSTILE_SITE_KEY }}
    steps:
      - uses: actions/checkout@<sha> # v7.0.1
        with: { persist-credentials: false }
      - uses: oven-sh/setup-bun@<sha> # v2.x
        with: { bun-version-file: package.json }
      - name: Restore bun install cache
        uses: actions/cache@<sha> # v6.x
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
          restore-keys: bun-${{ runner.os }}-
      - name: Set up Turborepo remote cache
        if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
        # Degrade to the local cache rather than fail the check if the OIDC
        # exchange is refused (e.g. a Dependabot run without id-token).
        continue-on-error: ${{ github.event_name == 'pull_request' }}
        uses: vercel/setup-turborepo-remote-cache-action@49d7b1b46ba4c9251e1977986bfe18336feabc8f # v1.1.0
        with: { team: ${{ vars.TURBO_TEAM }} }
      - name: Make the remote cache read-only on pull requests
        if: github.event_name == 'pull_request'
        run: echo "TURBO_CACHE=local:rw,remote:r" >> "$GITHUB_ENV"
      - name: Install dependencies
        run: bun install ${{ github.actor != 'dependabot[bot]' && '--frozen-lockfile' || '' }}
      - run: bun run fmt:check   # optional, see D3
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run test
      - run: bun run build
```

Pin every action by SHA with a version comment (barklog style); Dependabot's
`github-actions` ecosystem keeps them current.

Separate steps over one `turbo run lint typecheck test build`: the UI names the failing
check. With the transit node and a warm remote cache the lost overlap is small; switch to
a single `turbo run … --continue` if wall-clock matters more than readability.

Verify on the PR itself: the remote-cache step succeeds, turbo logs
`Remote caching enabled`, and a re-run of the job shows `cache hit, replaying logs`
for every task (read path works) while nothing is uploaded (PR read-only).

### Task 4 — `ci: merge CI and CD into one images pipeline`

Add `images.yaml` and `publish-image.yaml`; delete `ci.yaml` and `cd.yaml`.

`images.yaml`:

```yaml
name: Images
on:
  push: { branches: [main] }
  workflow_dispatch:
concurrency: # serialize; never cancel a half-pushed :latest
  group: images-${{ github.ref }}
  cancel-in-progress: false
permissions: {}
jobs:
  verify:
    name: Verify
    permissions: { contents: read, id-token: write }
    uses: ./.github/workflows/verify.yaml
    secrets: inherit # TURNSTILE_SITE_KEY
  publish:
    name: Publish ${{ matrix.app }}
    needs: verify
    permissions: { contents: read, packages: write, id-token: write }
    strategy:
      fail-fast: false
      matrix:
        app: [api, web, notifications]
    uses: ./.github/workflows/publish-image.yaml
    with:
      app: ${{ matrix.app }}
    secrets: inherit
```

`publish-image.yaml` (`workflow_call`, input `app`): checkout → remote-cache setup →
Buildx → GHCR login → `docker/metadata-action` → `build-push-action` with

```yaml
file: apps/${{ inputs.app }}/Dockerfile
tags: | # unchanged: compose.yaml pulls :latest
  type=sha,format=long,prefix=
  type=raw,value=latest,enable={{is_default_branch}}
cache-from: type=gha,scope=readometer-${{ inputs.app }}
cache-to: type=gha,scope=readometer-${{ inputs.app }},mode=max
secrets: |
  site-key=${{ secrets.TURNSTILE_SITE_KEY }}
  turbo_token=${{ env.TURBO_TOKEN }}
  turbo_team=${{ env.TURBO_TEAM }}
```

Platforms: see D2. Tag format stays `:<full sha>` + `:latest` so Dokploy and
`compose.yaml` are unaffected.

Verify after merge:

- `images.yaml` run: verify job uploads (turbo summary shows `cache miss, executing` then
  upload); `Publish web` log shows `web:build: cache hit, replaying logs` / `FULL TURBO`.
- `docker buildx imagetools inspect ghcr.io/chornonoh-vova/readometer-web:<sha>` lists the
  expected platforms; `:latest` digest equals `:<sha>` digest for all three images.
- `docker history --no-trunc` on the web image and the build record show no
  `TURBO_TOKEN`.
- Push a docs-only commit: verify is `FULL TURBO` end to end; image builds are layer-cache
  hits.

### Task 5 — `docs: CI/CD pipeline and remote cache policy`

- README "CI/CD" section: new file names, single pipeline, cache policy, platforms.
- CLAUDE.md: the `incremental` paragraph mentions CI's `typecheck`→`build` drop; keep it
  accurate, and add the parity rule (Docker-excluded files must not be task inputs) under
  Commands or a new "CI" section.
- Optionally `docs/adr/0001-turborepo-remote-cache.md` mirroring barklog's ADR-0008
  (readometer has no ADR folder yet — only if you want to start one).

## 5. Decisions for you

- **D1 — bun version.** Images run `1.4.3`, CI/`packageManager` run `1.3.14`.
  Recommend: bump `packageManager` to `1.4.3` (what prod already runs) and pin web's
  image to it too.
- **D2 — arm64.** Does anything pull the arm64 images (the VPS, a Pi, local M-series dev
  via compose)? Options:
  - (a) Drop arm64 → amd64 only, drop QEMU. Fastest; matches barklog. **Recommended if
    the VPS is x86.**
  - (b) Keep it, native: matrix over `ubuntu-latest` / `ubuntu-24.04-arm` (free for public
    repos), push by digest, then a merge job runs `docker buildx imagetools create` for
    `:<sha>` and `:latest`. Fast, but adds a job and ~40 lines.
  - (c) Keep QEMU as today. With P1/P2 fixed, web's arm64 leg replays the turbo cache, so
    only `bun install` (layer-cached unless `bun.lock` changes) stays emulated. Cheapest
    change.
- **D3 — add `fmt:check` to verify?** CI does not run it today; barklog does. Husky's
  lint-staged covers commits made locally, not Dependabot or web-UI edits.

## 6. Risks

- **OIDC policy not extended** → every turbo job fails at the setup step on main. Do
  prerequisite 1 first; PR runs degrade via `continue-on-error`.
- **Dependabot and `id-token`** — unverified whether Dependabot PR runs get an OIDC
  token. `continue-on-error` on PRs makes this harmless (local cache only).
- **Parity silently regresses** when someone adds a `.dockerignore` entry or a new
  `build.env` var. Mitigation: the task-4 verification (`FULL TURBO` in the web publish
  log) is the canary; note the rule in CLAUDE.md.
- **Cached tests with Testcontainers** — a Postgres image bump inside
  `globalSetup.ts` is a file change and invalidates; an upstream change behind the same
  tag does not. Same as today.
- **GHA cache 10 GB cap** with `mode=max` × 3 images (× 2 platforms). If evictions show
  up, move to `type=registry,ref=ghcr.io/…:buildcache`.
