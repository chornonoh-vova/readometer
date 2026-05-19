FROM oven/bun:1.3.14 AS base
WORKDIR /app

FROM base AS prepare
WORKDIR /app

RUN bun add -g turbo@^2
COPY . .
RUN turbo prune api --docker

FROM base AS runner
WORKDIR /app

COPY --from=prepare /app/out/json/ .
RUN bun install
COPY --from=prepare /app/out/full/ .

EXPOSE 3000/tcp
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD bun run healthcheck

WORKDIR /app/apps/api
CMD ["bun", "run", "start"]
