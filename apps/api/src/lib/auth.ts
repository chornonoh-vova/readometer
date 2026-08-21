import { betterAuth } from "better-auth";
import { pool } from "./database.ts";
import { captcha, lastLoginMethod } from "better-auth/plugins";
import { redisStorage } from "@better-auth/redis-storage";
import { redisClient } from "./redis.ts";
import { publishNotification } from "./notifications.ts";

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
    // Sign-up never returns a session, and sign-in 403s until the address is
    // verified. Note we deliberately do NOT set emailVerification.sendOnSignIn:
    // that would re-send a verification email on every blocked login attempt,
    // which is an email-bomb vector aimed at our sender reputation.
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await publishNotification({
        type: "password-reset-requested",
        data: {
          userId: user.id,
          name: user.name ?? null,
          resetUrl: url,
        },
        channels: {
          email: {
            to: user.email,
          },
        },
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // With autoSignIn off, clicking the emailed link is how a credential user
    // gets their first session. It also refreshes the session cookie: without
    // this flag better-auth skips setSessionCookie, so the cookieCache below
    // would keep serving emailVerified: false and lock a just-verified user
    // out for up to its maxAge.
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await publishNotification({
        type: "verification-email-requested",
        data: {
          userId: user.id,
          name: user.name ?? null,
          verificationUrl: url,
        },
        channels: {
          email: {
            to: user.email,
          },
        },
      });
    },
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
