FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y \
  curl \
  libvips \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS prepare
WORKDIR /app
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune api --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN bun install
COPY --from=prepare /app/out/full/ .

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN bun turbo build --filter=api

FROM base AS runner
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
RUN bun add sharp
EXPOSE 3000/tcp
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD curl -sf http://localhost:3000/api/healthz || exit 1
CMD ["bun", "dist/index.js"]
