import { betterAuth } from "better-auth";
import { pool } from "./database.ts";
import { captcha } from "better-auth/plugins";

export const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [
  process.env.BETTER_AUTH_URL!,
];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error("Google auth credentials are missing");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,

  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
    }),
  ],

  database: pool,

  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },

  advanced: {
    cookiePrefix: "readometer",
  },
});

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
