# syntax=docker/dockerfile:1

# Bun is pinned here, in apps/{api,web}/Dockerfile, and in "packageManager" in
# the root package.json (which CI reads). Keep all four in step: a different
# bun can rewrite the pruned bun.lock, and --frozen-lockfile then fails the
# build. Dependabot bumps tag and digest together.
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS base
ENV TURBO_TELEMETRY_DISABLED=1 \
    DO_NOT_TRACK=1
WORKDIR /app

# turbo is pinned to the root package.json's version. Keep the two in step.
FROM base AS prepare
COPY . .
RUN bunx turbo@2.11.10 prune notifications --docker

# Keyed on the pruned manifests alone, so a source-only change reuses the
# install layer.
FROM base AS runner
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=prepare /app/out/full/ .

EXPOSE 3001/tcp
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD bun src/healthcheck.ts

WORKDIR /app/apps/notifications
CMD ["bun", "src/index.ts"]
