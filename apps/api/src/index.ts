import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { showRoutes } from "hono/dev";

import { migrateToLatest } from "./lib/database.ts";
import type { AppEnv } from "./types.ts";
import { auth } from "./lib/auth.ts";

import session from "./middlewares/session.ts";
import requireAuth from "./middlewares/requireAuth.ts";

import me from "./routes/me.ts";
import books from "./routes/books.ts";

await migrateToLatest();

const app = new Hono<AppEnv>().basePath("/api");

app.use(cors());
app.use(compress());
app.use(logger());
app.use("*", session);

app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

app.use("*", requireAuth);

app.route("/me", me);
app.route("/books", books);

const isDev = process.env.NODE_ENV === "development";
const port = process.env.PORT || 3000;

if (isDev) {
  showRoutes(app, { verbose: true, colorize: true });
}

export default {
  port,
  fetch: app.fetch,
};
