import { Hono } from "hono";
import type { AuthVariables } from "../lib/auth";
import requireAuth from "../middlewares/requireAuth.ts";

const me = new Hono<{ Variables: AuthVariables }>();

me.use(requireAuth);

me.get("/", (c) => {
  const session = c.get("session");
  const user = c.get("user");

  return c.json({
    session,
    user,
  });
});

export default me;
