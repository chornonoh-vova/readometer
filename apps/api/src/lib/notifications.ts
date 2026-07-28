import { Queue } from "bullmq";
import Redis from "ioredis";
import { v4 } from "uuid";

import {
  NOTIFICATIONS_QUEUE_NAME,
  notificationEventSchema,
  type NotificationEvent,
} from "notification-events";

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

const notificationsQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, {
  connection,
  prefix: "readometer",
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export async function publishNotification(
  event: Omit<NotificationEvent, "eventId" | "occurredAt">,
) {
  const payload = notificationEventSchema.parse({
    ...event,
    eventId: v4(),
    occurredAt: new Date().toISOString(),
  });

  await notificationsQueue.add(payload.type, payload, {
    jobId: payload.eventId,
  });
}
