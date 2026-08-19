# @readometer/notifications

The Readometer notification worker: a [BullMQ](https://docs.bullmq.io)
consumer on [Bun](https://bun.com) that renders
[React Email](https://react.email) templates and sends them over SMTP with
[nodemailer](https://nodemailer.com).

`apps/api` is the producer. It resolves everything a notification needs —
recipient address, display name, signed URL — and enqueues a fully-formed
event; this service only renders and delivers. It has **no database access
and no business logic**, and is meant to stay that way.

## Stack

- **Runtime**: Bun
- **Queue**: BullMQ over [ioredis](https://github.com/redis/ioredis),
  backed by Dragonfly (Redis-compatible)
- **Contract**: `notification-events` (workspace package) — the Zod
  discriminated union both sides validate against
- **Templates**: React Email + Tailwind CSS v4, previewed with `email dev`
- **Transport**: nodemailer over plain SMTP — Mailpit locally, Resend's
  relay in production

## How a notification flows

```
apps/api                          Dragonfly                apps/notifications
────────                          ─────────                ──────────────────
publishNotification(event)
  ├ parse with notificationEventSchema
  ├ eventId = uuid v4, occurredAt = now
  └ queue.add(type, payload, { jobId: eventId })  ──▶  {notifications}
                                                            │
                                                            ▼
                                                     Worker (concurrency 5)
                                                       ├ notificationEventSchema.parse(job.data)
                                                       ├ handlers[event.type](event)
                                                       ├ render(<Template …/>) → HTML
                                                       └ sendMail({ to, subject, html })
```

The schema is parsed on **both** ends: once before enqueueing, once after
dequeueing. The payload is JSON in Redis in between, so nothing about the
producer's types survives the trip — the parse on this side is what makes
`event` trustworthy.

`jobId` is the event's UUID, which gives BullMQ-level deduplication: the same
`eventId` enqueued twice is one job. Failed jobs retry 5 times with
exponential backoff (from 2 s), configured on the producer side in
`apps/api/src/lib/notifications.ts`.

Today both events originate from Better Auth: `publishNotification` is wired
into its `sendVerificationEmail` and `sendResetPassword` hooks in
`apps/api/src/lib/auth.ts`.

## File layout

```
src/
├── index.ts               # entry: starts the worker + healthcheck server, wires shutdown
├── worker.ts              # the BullMQ Worker and its Redis connection
├── healthcheck.ts         # standalone probe used by Docker HEALTHCHECK
├── handlers/
│   ├── index.ts           # event type → handler map
│   ├── verification-email.ts
│   └── password-reset.ts
├── templates/             # React Email components (also the `email dev` preview root)
│   ├── email-layout.tsx   # shared shell: brand mark, Inter font, footer
│   ├── verification-email.tsx
│   └── password-reset.tsx
├── lib/
│   ├── mailer.ts          # the single nodemailer transport
│   └── shutdown.ts        # graceful drain (duplicated verbatim in apps/api)
└── tailwind.config.ts     # apps/web's theme tokens as hex — email clients lack oklch()
```

`src/index.ts` runs an HTTP server too, but only to serve
`GET /api/healthz`; it does not accept notification requests. The worker is
created with `autorun: false` and started explicitly, so the process controls
when consumption begins.

### Adding an event type

1. Add the event's schema to `packages/notification-events/src/index.ts` and
   include it in `notificationEventSchema`'s union.
2. Add a template under `src/templates/`, wrapped in `EmailLayout`, with a
   default export so `email dev` picks it up.
3. Add a handler under `src/handlers/` and register it in
   `src/handlers/index.ts` — the map is keyed by `event.type`, so a missing
   entry is a type error rather than a runtime surprise.
4. Call `publishNotification` from `apps/api` with the resolved recipient.

Adding a **delivery channel** (push, say) means adding a key under the
event's `channels` object plus a sender module beside `lib/mailer.ts`, and
leaves existing events untouched.

## Graceful shutdown

On `SIGTERM`/`SIGINT`, `onShutdown` closes resources in array order, and the
order is deliberate:

1. **worker** — `close()` waits for in-flight jobs to finish _and_
   acknowledge, so a redelivery can't re-send an email that already went out.
2. **healthcheck-http** — kept alive through the drain, so the orchestrator
   doesn't mark the container unhealthy while it is legitimately finishing work.
3. **redis** — last, because BullMQ treats an injected connection as shared
   and never closes it itself.

If the drain exceeds `SHUTDOWN_TIMEOUT_MS` (default 8000), the process logs
which closer hung and exits 1. Keep that value below the orchestrator's stop
grace period — Docker defaults to 10 s — or the process is SIGKILLed mid-drain.

## Scripts

```sh
bun run dev           # both of the next two, in parallel
bun run service:dev   # bun --watch src/index.ts
bun run preview:dev   # email dev --dir ./src/templates --port 3002
bun run typecheck     # tsc --noEmit
bun run lint          # eslint .
bun run test          # vitest run (needs Docker)
bun run test:coverage # vitest run --coverage
```

The template preview on <http://localhost:3002> is standalone — it needs
neither Redis nor the API, so iterating on markup doesn't require the rest of
the stack. Formatting is repo-wide, not per-app: run `bun run fmt` from the
repo root.

Tests spin up containers via testcontainers in `test/globalSetup.ts` — Redis,
plus Mailpit, so `test/mailer-mailpit.spec.ts` can assert real SMTP delivery
by reading Mailpit's HTTP API. Docker must be running. Coverage thresholds are
enforced (85% lines/statements).

## Environment variables

See `sample.env` for a working development configuration.

| Variable              | Required | Description                                                          |
| --------------------- | -------- | -------------------------------------------------------------------- |
| `PORT`                | no       | Healthcheck server port; defaults to `3001`                          |
| `NODE_ENV`            | no       | `development` locally                                                |
| `REDIS_URL`           | yes      | Dragonfly/Redis URL — **must match `apps/api`**, it's the same queue |
| `SMTP_HOST`           | yes      | `mailpit` locally, `smtp.resend.com` in production                   |
| `SMTP_PORT`           | yes      | `1025` locally, `587` in production                                  |
| `SMTP_SECURE`         | yes      | Implicit TLS — `false` in both dev and production                    |
| `SMTP_USER`           | no       | Leave unset against Mailpit; `resend` in production                  |
| `SMTP_PASS`           | no       | Leave unset against Mailpit; the Resend API key in production        |
| `MAIL_FROM`           | yes      | From address on outgoing mail                                        |
| `SHUTDOWN_TIMEOUT_MS` | no       | Drain deadline on SIGTERM; defaults to `8000`                        |

`lib/mailer.ts` omits nodemailer's `auth` entirely when `SMTP_USER` is unset,
which is what lets the same code path serve unauthenticated Mailpit and
authenticated Resend. Plain SMTP rather than the Resend SDK is a deliberate
choice for exactly that reason.

## Docker

`Dockerfile` is a multi-stage build: `turbo prune notifications --docker`
produces a pruned context, `bun install` runs against the pruned manifests,
and the final image runs `bun src/index.ts` — there is **no build step**, the
service runs straight from TypeScript source. `HEALTHCHECK` shells out to
`bun src/healthcheck.ts`, which probes `/api/healthz` over localhost.

The image is published to
`ghcr.io/chornonoh-vova/readometer-notifications` by
`.github/workflows/docker.yaml`.
