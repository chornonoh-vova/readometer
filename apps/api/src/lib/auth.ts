import { betterAuth } from "better-auth";
import { pool } from "./database.ts";

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [
  process.env.BETTER_AUTH_URL!,
];

export const auth = betterAuth({
  database: pool,

  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },
});

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
