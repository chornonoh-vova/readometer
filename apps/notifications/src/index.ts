import { worker } from "./worker.ts";

worker.run();

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
