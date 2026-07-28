# apps/notifications

BullMQ worker that renders React Email templates and sends them over SMTP. Decoupled
producer/consumer over a queue backed by Dragonfly (Redis-compatible; also Better Auth's
session cache).

- **`apps/api` owns all business logic and DB access.** `publishNotification`
  (`apps/api/src/lib/notifications.ts`) enqueues fully-resolved events, wired into Better
  Auth's `sendVerificationEmail`/`sendResetPassword` hooks in `apps/api/src/lib/auth.ts`.
- This service is deliberately **stateless with no DB access**: a `Worker`
  (`src/worker.ts`) renders a template per event type (`src/templates/`, `src/handlers/`)
  and sends it via `nodemailer` (`src/lib/mailer.ts`). Keep it that way — resolve delivery
  targets (email address, etc.) in the API before enqueueing, never here.
- Plain SMTP rather than the Resend SDK, so the same code path runs against Mailpit
  locally and Resend's relay in production.
- Adding a delivery channel (e.g. push) means adding a new key under an event's `channels`
  object plus a new sender module, without touching existing events.
- Tests spin up a real Redis container per run (not to be confused with `apps/api`'s
  Postgres container); one test also spins up Mailpit to verify SMTP delivery end-to-end.
