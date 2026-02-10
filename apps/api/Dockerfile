FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*
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

FROM base AS runner
WORKDIR /app
COPY --from=builder /app .
USER bun
EXPOSE 3000/tcp
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD curl -sf http://localhost:3000/api/healthz || exit 1
WORKDIR /app/apps/api
CMD ["bun", "run", "src/index.ts"]
