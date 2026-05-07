import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";
import { auth } from "../lib/auth.ts";

export const session = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const { user, session } = (await auth.api.getSession({
      headers: c.req.raw.headers,
    })) ?? { user: null, session: null };

    c.set("user", user);
    c.set("session", session);
    await next();
  });
