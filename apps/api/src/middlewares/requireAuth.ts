import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";
import { HTTPException } from "hono/http-exception";

export const requireAuth = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401);
    }

    // Unverified accounts reach nothing behind this gate. Mounted in app.ts
    // with app.use("*") after healthz/readyz and the better-auth handler, so
    // those stay reachable and a blocked user can still verify or sign out.
    if (!user.emailVerified) {
      throw new HTTPException(403, { message: "Email not verified" });
    }

    await next();
  });
