# notification-events

The contract between `apps/api` (producer) and `apps/notifications`
(consumer): the queue name they agree on, and a Zod discriminated union
describing every notification event that can travel between them. Small,
dependency-light (just Zod), and covered by Vitest.

## Why it's a package

The two services talk over BullMQ, so payloads are serialized to JSON in
Redis and nothing about the producer's types survives the trip. Sharing the
schema — rather than a hand-mirrored `interface` on each side — is what keeps
the ends from drifting.

The schema is therefore `.parse()`d **twice**, once on each side of the queue:

- `apps/api/src/lib/notifications.ts` parses before `queue.add`, so a
  malformed event fails at the call site that produced it.
- `apps/notifications/src/worker.ts` parses `job.data` after dequeueing,
  because a job may have been enqueued by an older deploy.

## Event shape

Every event extends a common base and carries three parts:

```ts
{
  eventId: string,       // uuid v4 — also used as the BullMQ jobId, so it dedupes
  occurredAt: string,    // ISO 8601
  type: "…",             // the discriminant
  data: { … },           // what the template needs to render
  channels: { email: { to } },  // where it goes, resolved by the producer
}
```

The `data`/`channels` split is the important part. `data` is template input;
`channels` is delivery targeting. Because the producer owns `channels`, the
worker never has to look a user up — it has no database access, and keeping
recipient resolution on the API side is what allows that.

`eventId` and `occurredAt` are **not** passed in by callers:
`publishNotification` takes `Omit<NotificationEvent, "eventId" | "occurredAt">`
and stamps both itself.

## Exports

| Export                             | What it is                                                          |
| ---------------------------------- | ------------------------------------------------------------------- |
| `notificationEventSchema`          | `z.discriminatedUnion("type", …)` over every event below            |
| `NotificationEvent`                | `z.infer` of the union — the type both services pass around         |
| `verificationEmailRequestedSchema` | `verification-email-requested`: `{ userId, name, verificationUrl }` |
| `passwordResetRequestedSchema`     | `password-reset-requested`: `{ userId, name, resetUrl }`            |
| `NOTIFICATIONS_QUEUE_NAME`         | `"{notifications}"` — see below                                     |

`name` is nullable on both events (Better Auth allows an account without a
display name); the URLs are validated as URLs and `channels.email.to` as an
email address, so an unusable event can't reach the queue.

### The braces in `{notifications}`

They are a Redis Cluster **hash tag**: only the substring inside the braces is
hashed, so every key BullMQ derives from the queue name lands on one slot.
BullMQ drives the queue with multi-key Lua scripts, which a clustered backend
refuses to run across slots — this is the form BullMQ documents for cluster
compatibility, and it is harmless on a single node. The braces are part of the
name: both sides must pass the same string, so don't strip them.

## Usage

The package is workspace-internal (`"private": true`) and consumed via Bun
workspaces, straight from source — there is no build step:

```jsonc
// apps/api/package.json
"dependencies": {
  "notification-events": "workspace:*"
}
```

Producing (`apps/api`):

```ts
import { publishNotification } from "./lib/notifications";

await publishNotification({
  type: "password-reset-requested",
  data: { userId: user.id, name: user.name, resetUrl: url },
  channels: { email: { to: user.email } },
});
```

Consuming (`apps/notifications`):

```ts
import {
  NOTIFICATIONS_QUEUE_NAME,
  notificationEventSchema,
} from "notification-events";

const worker = new Worker(NOTIFICATIONS_QUEUE_NAME, async (job) => {
  const event = notificationEventSchema.parse(job.data);
  await handlers[event.type](event as never);
});
```

## Adding an event

Add the schema here first, include it in `notificationEventSchema`'s union,
then add the matching template and handler in `apps/notifications` — the
handler map is keyed by `event.type`, so a missing handler is a type error, not
a runtime surprise. See `apps/notifications/README.md` for the full checklist.

## Scripts

```sh
bun run test        # vitest
bun run typecheck   # tsc --noEmit
bun run lint        # eslint .
```
