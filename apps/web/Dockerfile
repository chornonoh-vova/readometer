# syntax=docker/dockerfile:1

# Bun is pinned here, in apps/{api,notifications}/Dockerfile, and in
# "packageManager" in the root package.json (which CI reads). Keep all four in
# step: a different bun can rewrite the pruned bun.lock, and --frozen-lockfile
# then fails the build. Dependabot bumps tag and digest together.
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS base
ENV TURBO_TELEMETRY_DISABLED=1 \
    DO_NOT_TRACK=1
WORKDIR /app

# turbo is pinned to the root package.json's version. Keep the two in step.
#
# Pruned to every app, not just web. Turbo's bun pruner re-hoists bun.lock when
# it drops packages, which changes the external-dependency hash of web's
# workspace dependencies, so `prune web` alone makes web#build hash differently
# from CI and never hits the remote cache. Only this builder carries the extra
# packages; the runtime image below is nginx and dist/.
FROM base AS prepare
COPY . .
RUN bunx turbo@2.11.10 prune web api notifications --docker

# Its own stage so CI can build and cache it (`--target deps`) while the
# checks run, before the build below has a remote cache entry to replay.
FROM base AS deps
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile

# web#build hashes the same here as in CI's verify run, so with the remote
# cache this replays dist/ instead of running vite. That holds only while
# every file .dockerignore drops is also outside the task's inputs in
# turbo.json, and VITE_TURNSTILE_SITE_KEY matches the one CI builds with.
#
# Turborepo credentials are BuildKit secrets, mounted for this step only and
# never written to a layer or to the exported build cache. Without them (a
# local `docker build`, or a run dispatched from a branch) turbo runs on its
# local cache. Do not mount TURBO_CACHE the same way: an unpassed secret mount
# still exports its variable as an empty string, which turbo reads as "no
# cache sources" and bypasses the cache entirely.
FROM deps AS builder
COPY --from=prepare /app/out/full/ .
RUN --mount=type=secret,id=site-key,env=VITE_TURNSTILE_SITE_KEY \
    --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    --mount=type=secret,id=turbo_team,env=TURBO_TEAM \
    bun turbo run build --filter=web --ui=stream

# The runtime carries static files only. The stock image runs its master as
# root; this one runs unprivileged, so nginx.conf is replaced with one that
# runs as the `nginx` user (see the header of that file) and the server
# listens on 8080.
FROM nginx:1.31.7@sha256:8632b3314d74c61f0e27f59055bab13f7793b988c94c090154d867bc29e0f39b AS runner
USER nginx
# From the build context, not from `builder`: this is checked-in configuration
# rather than build output. turbo.json keeps nginx/** (and this Dockerfile) out
# of web#build's inputs, so an edit here replays the cached build.
COPY apps/web/nginx/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY apps/web/nginx/snippets/ /etc/nginx/snippets/
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/
EXPOSE 8080/tcp
CMD ["nginx", "-g", "daemon off;"]
