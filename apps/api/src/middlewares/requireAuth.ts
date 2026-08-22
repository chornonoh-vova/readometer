import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";
import { HTTPException } from "hono/http-exception";
import { isBanned } from "../lib/moderation.ts";

export const requireAuth = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401);
    }

    // Read from Postgres, not the session: the session blob is Redis-cached for
    // 14 days, which would delay a ban by that long.
    if (await isBanned(user.id)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    // Mounted after healthz/readyz and /auth/*, so those stay reachable.
    if (!user.emailVerified) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    await next();
  });
