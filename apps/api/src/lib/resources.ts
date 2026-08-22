import { db } from "./database.ts";
import { redisClient } from "./redis.ts";
import { connection, notificationsQueue } from "./notifications.ts";
import { closeRedisClient, type Closer } from "./shutdown.ts";

/**
 * Every long-lived resource the process opens, in the order they must close:
 * the queue before the connection BullMQ borrows from us, and the pg pool that
 * Better Auth shares last.
 */
export const resourceClosers: Closer[] = [
  { name: "notifications-queue", close: () => notificationsQueue.close() },
  { name: "notifications-redis", close: () => closeRedisClient(connection) },
  { name: "auth-redis", close: () => closeRedisClient(redisClient) },
  { name: "database", close: () => db.destroy() },
];
