import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";
import { HTTPException } from "hono/http-exception";

const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401);
  }

  await next();
});

export default requireAuth;
