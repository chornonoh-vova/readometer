import { Hono } from "hono";
import type { AppEnv } from "./types";
import { cors } from "hono/cors";
import { auth, trustedOrigins } from "./lib/auth";
import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { showRoutes } from "hono/dev";

import session from "./middlewares/session";
import requireAuth from "./middlewares/requireAuth";

import healthz from "./routes/healthz";
import readyz from "./routes/readyz";
import me from "./routes/me";
import books from "./routes/books";
import readingRuns from "./routes/readingRuns";
import readingSessions from "./routes/readingSessions";

const app = new Hono<AppEnv>().basePath("/api");

app.use(
  cors({
    origin: trustedOrigins,
    credentials: true,
  }),
);
app.use(compress());
app.use(logger());
app.use("*", session);

app.route("/healthz", healthz);
app.route("/readyz", readyz);

app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

app.use("*", requireAuth);

app.route("/me", me);
app.route("/books", books);
app.route("/reading-runs", readingRuns);
app.route("/reading-sessions", readingSessions);

export function start() {
  const isDev = process.env.NODE_ENV === "development";
  const port = process.env.PORT || 3000;

  if (isDev) {
    showRoutes(app, { verbose: true, colorize: true });
  }

  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`Listening on ${server.url}`);
}
