FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS prepare
WORKDIR /app
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune web --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN bun install
COPY --from=prepare /app/out/full/ .

ARG TURNSTILE_SITE_KEY
ENV VITE_TURNSTILE_SITE_KEY=$TURNSTILE_SITE_KEY
RUN bun turbo build --filter=web

FROM nginx:1.29 AS runner
COPY --from=builder /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80/tcp
CMD ["nginx", "-g", "daemon off;"]

