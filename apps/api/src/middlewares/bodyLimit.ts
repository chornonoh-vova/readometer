import { bodyLimit } from "hono/body-limit";
import { createMiddleware } from "hono/factory";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "../types.ts";
import { BODY_LIMITS } from "../lib/limits.ts";

const COVER_PATH = /^\/api\/books\/[^/]+\/cover$/;

/**
 * Which body-size tier a path falls into.
 *
 * Exported separately from the middleware so tier routing can be tested
 * without allocating multi-megabyte request bodies.
 */
export function limitForPath(path: string): keyof typeof BODY_LIMITS {
  if (path.startsWith("/api/auth/")) return "auth";
  if (COVER_PATH.test(path)) return "upload";
  return "json";
}

/** Matches the `{ message }` shape `app.onError` serialises. */
const tooLarge = (c: Context) =>
  c.json({ message: "Request body too large" }, 413);

const tiers: Record<keyof typeof BODY_LIMITS, MiddlewareHandler> = {
  auth: bodyLimit({ maxSize: BODY_LIMITS.auth, onError: tooLarge }),
  json: bodyLimit({ maxSize: BODY_LIMITS.json, onError: tooLarge }),
  upload: bodyLimit({ maxSize: BODY_LIMITS.upload, onError: tooLarge }),
};

/**
 * One middleware that picks the tier, rather than three overlapping
 * `app.use()` registrations. Hono runs *every* matching middleware in
 * registration order, so a wildcard 64KB limit registered alongside a 1MB
 * cover limit would reject cover uploads. One decision, one place.
 */
export const requestBodyLimit = (): MiddlewareHandler =>
  createMiddleware<AppEnv>((c, next) =>
    tiers[limitForPath(c.req.path)](c, next),
  );
