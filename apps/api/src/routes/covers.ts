import { Hono } from "hono";
import type { AppEnv } from "../types";
import { serveStatic } from "hono/bun";

const covers = new Hono<AppEnv>();

covers.use(
  "*",
  serveStatic({
    root: process.env.STORAGE_PATH,
    rewriteRequestPath: (path) => path.replace(/^\/api/, ""),
  }),
);

export default covers;
