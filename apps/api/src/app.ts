import { Hono } from "hono";
import type { AppEnv } from "./types";
import { cors } from "hono/cors";
import { auth, trustedOrigins } from "./lib/auth";
import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { showRoutes } from "hono/dev";
import { requestId } from "hono/request-id";

import session from "./middlewares/session.ts";
import requireAuth from "./middlewares/requireAuth.ts";

import healthz from "./routes/healthz.ts";
import readyz from "./routes/readyz.ts";
import me from "./routes/me.ts";
import books from "./routes/books.ts";
import covers from "./routes/covers.ts";
import readingActivity from "./routes/readingActivity.ts";
import readingRuns from "./routes/readingRuns.ts";
import readingSessions from "./routes/readingSessions.ts";
import bookCover from "./routes/bookCovers.ts";

const app = new Hono<AppEnv>().basePath("/api");

app.use(
  cors({
    origin: trustedOrigins,
    credentials: true,
  }),
);
app.use(compress());
app.use(logger());
app.use("*", requestId());
app.use("*", session);

app.route("/healthz", healthz);
app.route("/readyz", readyz);

app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

app.use("*", requireAuth);

app.route("/me", me);
app.route("/books", books);
app.route("/books", bookCover);
app.route("/covers", covers);
app.route("/reading-activity", readingActivity);
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
