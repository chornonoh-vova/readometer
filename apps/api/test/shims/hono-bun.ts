import type { MiddlewareHandler } from "hono";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

type ServeStaticOptions = {
  root?: string;
  rewriteRequestPath?: (path: string) => string;
};

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

export function serveStatic(opts: ServeStaticOptions = {}): MiddlewareHandler {
  const rootRaw = opts.root ?? ".";
  return async (c, next) => {
    const rewritten = opts.rewriteRequestPath
      ? opts.rewriteRequestPath(c.req.path)
      : c.req.path;
    const root = resolve(rootRaw);
    const requested = normalize(join(root, decodeURIComponent(rewritten)));

    if (requested !== root && !requested.startsWith(root + sep)) {
      return c.notFound();
    }

    try {
      const stat = statSync(requested);
      if (!stat.isFile()) return c.notFound();
    } catch {
      await next();
      return;
    }

    const type = MIME[extname(requested).toLowerCase()] ?? "application/octet-stream";
    const body = await readFile(requested);
    return c.body(new Uint8Array(body), 200, { "content-type": type });
  };
}

export function createBunWebSocket() {
  return { upgradeWebSocket: () => () => {}, websocket: {} };
}
