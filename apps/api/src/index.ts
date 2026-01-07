import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { migrateToLatest } from "./lib/database.ts";
import { auth } from "./lib/auth.ts";

await migrateToLatest();

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const isDev = process.env.NODE_ENV === "development";
const port = process.env.PORT || 3000;

if (isDev) {
  showRoutes(app, { verbose: true, colorize: true });
}

export default {
  port,
  fetch: app.fetch,
};
