import { start } from "./app";
import { db } from "./lib/database";
import { redisClient } from "./lib/redis";
import { connection, notificationsQueue } from "./lib/notifications";
import { closeRedisClient, onShutdown } from "./lib/shutdown";

const server = start();

// order matters: stop accepting requests first, and close the database last so
// in-flight requests can still finish their queries
onShutdown([
  // `stop()` without arguments leaves in-flight requests alone and resolves once
  // they have drained
  { name: "http", close: () => server.stop() },
  // the queue must go before its connection: BullMQ treats an injected
  // connection as shared and never closes it itself
  { name: "notifications-queue", close: () => notificationsQueue.close() },
  { name: "notifications-redis", close: () => closeRedisClient(connection) },
  { name: "auth-redis", close: () => closeRedisClient(redisClient) },
  // ends the pg pool that Better Auth shares
  { name: "database", close: () => db.destroy() },
]);
