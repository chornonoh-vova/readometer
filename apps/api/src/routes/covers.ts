import { Hono } from "hono";
import type { AppEnv } from "../types";
import { serveStatic } from "hono/bun";
import { etag } from "hono/etag";

const covers = new Hono<AppEnv>();

const maxAge = 7 * 24 * 60 * 60;
const staleWhileRevalidate = 24 * 60 * 60;
const cacheControlHeader = [
  "private",
  "immutable",
  `max-age=${maxAge}`,
  `stale-while-revalidate=${staleWhileRevalidate}`,
].join(", ");

covers.use("*", etag());
covers.use(
  "*",
  serveStatic({
    root: process.env.STORAGE_PATH,
    rewriteRequestPath: (path) => path.replace(/^\/api/, ""),
    onFound(_path, c) {
      c.header("Cache-Control", cacheControlHeader);
    },
  }),
);

export default covers;
