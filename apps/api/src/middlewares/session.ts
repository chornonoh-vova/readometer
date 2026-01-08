import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";
import { auth } from "../lib/auth.ts";

const session = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

export default session;
