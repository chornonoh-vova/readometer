import { redisClient, worker } from "./worker.ts";
import { closeRedisClient, onShutdown } from "./lib/shutdown.ts";

// the run loop can reject as close() tears it down; without this the rejection
// would surface as an unhandled error in the middle of a clean shutdown
worker.run().catch((err) => {
  console.error("worker run loop stopped", err);
});

const port = process.env.PORT || 3001;

const server = Bun.serve({
  port,
  routes: {
    "/api/healthz": {
      GET: () => {
        return Response.json({ status: "ok" });
      },
    },
  },
});

console.log(`Listening on ${server.url}`);

// close the worker before the healthcheck server, so /api/healthz keeps
// answering while active jobs drain and Docker cannot flag the container
onShutdown([
  // waits for the in-flight jobs to finish *and acknowledge*, so a redelivery
  // cannot re-send an email that already went out
  { name: "worker", close: () => worker.close() },
  { name: "healthcheck-http", close: () => server.stop() },
  // last: BullMQ treats an injected connection as shared and never closes it
  // itself, so the worker above must be done with it first
  { name: "redis", close: () => closeRedisClient(redisClient) },
]);
