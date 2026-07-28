import Redis from "ioredis";
import { Worker } from "bullmq";
import {
  NOTIFICATIONS_QUEUE_NAME,
  notificationEventSchema,
} from "notification-events";
import { handlers } from "./handlers/index.ts";

const redisClient = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const worker = new Worker(
  NOTIFICATIONS_QUEUE_NAME,
  async (job) => {
    const event = notificationEventSchema.parse(job.data);
    await handlers[event.type](event as never);
  },
  {
    connection: redisClient,
    autorun: false,
    prefix: "readometer",
    concurrency: 5,
    removeOnComplete: { count: 500 },
    removeOnFail: { age: 24 * 60 * 60, count: 1000 },
  },
);

worker.on("failed", (job, err) => {
  console.error(`notification job ${job?.id} (${job?.name}) failed`, err);
});
