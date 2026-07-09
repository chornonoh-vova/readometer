import { betterAuth } from "better-auth";
import { pool } from "./database.ts";
import { captcha, lastLoginMethod } from "better-auth/plugins";
import { redisStorage } from "@better-auth/redis-storage";
import { redisClient } from "./redis.ts";

const baseURL = process.env.BETTER_AUTH_URL;

if (!baseURL) {
  throw new Error("Base URL is missing");
}

export const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [
  baseURL,
];

const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;

if (!turnstileSecretKey) {
  throw new Error("Turnstile secret key is missing");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error("Google auth credentials are missing");
}

export const auth = betterAuth({
  baseURL,

  plugins: [
    lastLoginMethod(),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: turnstileSecretKey,
    }),
  ],

  database: pool,

  secondaryStorage: redisStorage({
    client: redisClient,
    keyPrefix: "readometer-auth:",
  }),

  trustedOrigins,

  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24 * 2, // 2 days
    deferSessionRefresh: true,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 10, // 10 minutes
    },
  },

  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 60,
    max: 100,
  },

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
