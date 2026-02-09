import { betterAuth } from "better-auth";
import { pool } from "./database.ts";
import { captcha } from "better-auth/plugins";

export const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [
  process.env.BETTER_AUTH_URL!,
];

export const auth = betterAuth({
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
    }),
  ],

  basePath: "/auth",

  database: pool,

  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    cookiePrefix: "readometer",
  },
});

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
