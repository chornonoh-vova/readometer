import type { RequestIdVariables } from "hono/request-id";
import type { TimingVariables } from "hono/timing";
import type { AuthVariables } from "./lib/auth";

export type AppEnv = {
  Variables: AuthVariables & RequestIdVariables & TimingVariables;
};
