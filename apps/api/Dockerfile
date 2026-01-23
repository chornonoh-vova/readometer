FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS prepare
WORKDIR /app
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune api --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN bun install --production
COPY --from=prepare /app/out/full/ .

FROM base AS runner
WORKDIR /app
COPY --from=builder /app .
USER bun
EXPOSE 3000/tcp
WORKDIR /app/apps/api
ENTRYPOINT ["bun", "run", "src/index.ts"]
