import { betterAuth } from "better-auth";
import { pool } from "./database.ts";

export const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [
  process.env.BETTER_AUTH_URL!,
];

const appDomain = process.env.APP_DOMAIN;

export const auth = betterAuth({
  basePath: "/auth",

  database: pool,

  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    cookiePrefix: "readometer",
    ...(appDomain && {
      crossSubDomainCookies: {
        enabled: true,
        domain: appDomain,
      },
    }),
  },
});

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
