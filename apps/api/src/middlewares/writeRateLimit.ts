import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types.ts";
import { redisClient } from "../lib/redis.ts";
import { RATE_LIMITS } from "../lib/limits.ts";

export const WRITE_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

const WINDOW_MS = RATE_LIMITS.windowSeconds * 1_000;

/**
 * Fixed-window write limiter, keyed per user.
 *
 * The window index is part of the key, so the counter dies on its own and
 * re-setting the TTL on every request is harmless - which keeps this to one
 * round trip without relying on `EXPIRE NX` (Redis 7+, not guaranteed on
 * Dragonfly).
 *
 * Fails open: if Dragonfly is unreachable the write proceeds. The per-user
 * QUOTAS still bound total damage, so a cache outage should not take writes
 * down with it.
 */
export const writeRateLimit = (): MiddlewareHandler =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!WRITE_METHODS.has(c.req.method)) return next();

    const userId = c.get("user")?.id;
    if (!userId) return next(); // requireAuth already rejected, or will

    const window = Math.floor(Date.now() / WINDOW_MS);
    const key = `readometer-write-rate:${userId}:${window}`;

    let count: number;
    try {
      const results = await redisClient
        .multi()
        .incr(key)
        .expire(key, RATE_LIMITS.windowSeconds)
        .exec();

      count = Number(results?.[0]?.[1] ?? 0);
    } catch (error) {
      console.error("write rate limit unavailable, failing open", error);
      return next();
    }

    // `>` not `>=`: INCR returns the count including this request, so the
    // hundredth write returns 100 and must still be allowed.
    if (count > RATE_LIMITS.writesPerWindow) {
      const retryAfter = Math.ceil(
        ((window + 1) * WINDOW_MS - Date.now()) / 1_000,
      );

      // Returned rather than thrown: HTTPException does not carry the
      // Retry-After header through app.onError.
      return c.json(
        {
          message: `Too many writes. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }

    return next();
  });
