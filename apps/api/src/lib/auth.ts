import { betterAuth } from "better-auth";
import { pool } from "./database.ts";
import { captcha, lastLoginMethod } from "better-auth/plugins";
import { redisStorage } from "@better-auth/redis-storage";
import { redisClient } from "./redis.ts";
import { publishNotification } from "./notifications.ts";
import { APIError, createAuthMiddleware } from "better-auth/api";
import {
  isAllowedSignupDomain,
  isDisposableEmailDomain,
  isEmailSignupEnabled,
  isNameWithinLimit,
  truncateUserAgent,
} from "./accountPolicy.ts";
import { isBanned } from "./moderation.ts";
import { BOT_SCORE_THRESHOLD, scoreSignup } from "./botScore.ts";
import { APPLE_ORIGIN, generateAppleClientSecret } from "./appleAuth.ts";

const baseURL = process.env.BETTER_AUTH_URL;

if (!baseURL) {
  throw new Error("Base URL is missing");
}

// Apple form_posts the callback from its own host, so the origin check sees
// `Origin: https://appleid.apple.com` and rejects it unless that host is trusted.
export const trustedOrigins = [
  ...(process.env.TRUSTED_ORIGINS?.split(",") ?? [baseURL]),
  APPLE_ORIGIN,
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

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleKeyId = process.env.APPLE_KEY_ID;
const applePrivateKey = process.env.APPLE_PRIVATE_KEY;

const appleAppBundleIdentifier = process.env.APPLE_APP_BUNDLE_IDENTIFIER;

if (
  !appleClientId ||
  !appleTeamId ||
  !appleKeyId ||
  !applePrivateKey ||
  !appleAppBundleIdentifier
) {
  throw new Error("Apple auth credentials are missing");
}

/**
 * Deliberately says nothing about which signal fired. A specific message is a
 * free oracle for tuning the next batch of names against.
 */
const SIGNUP_REJECTED = "This name or email address cannot be used.";

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

  // No cookieCache: it put a 10-minute floor under how fast a ban takes effect.
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24 * 2, // 2 days
    deferSessionRefresh: true,
  },

  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 60,
    max: 100,
  },

  emailAndPassword: {
    enabled: true,
    // Do not add emailVerification.sendOnSignIn: it re-sends on every blocked
    // login attempt, which is an email-bomb vector at our sender reputation.
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
    // Required, not cosmetic: better-auth only calls setSessionCookie when this
    // is set, so without it a just-verified user keeps the session they had.
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

  // Scoped to /sign-up/email on purpose. A databaseHooks.user.create.before
  // check would also fire for Google OAuth, where a Workspace user's email is a
  // custom domain - that would break "Sign up with Google" for exactly the
  // users the OAuth path exists to serve.
  //
  // `ctx.path` is the un-prefixed better-auth path (verified empirically:
  // /sign-out, /get-session), not /api/auth/....
  //
  // The captcha plugin's before-hook runs ahead of this one, so an unsolved
  // captcha is rejected first (the cheaper rejection). Tests reach this by
  // sending an x-captcha-response header.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;

      // The kill switch. Checked before anything else on this path, and only on
      // this path: /sign-in/email and the password-reset routes stay open.
      if (!isEmailSignupEnabled()) {
        throw new APIError("FORBIDDEN", {
          message:
            'Email sign-up is temporarily unavailable. Use "Sign up with Google" or "Sign up with Apple" instead.',
        });
      }

      const email = (ctx.body as { email?: unknown } | undefined)?.email;

      if (typeof email !== "string" || !isAllowedSignupDomain(email)) {
        throw new APIError("BAD_REQUEST", {
          message:
            'Email sign-up is limited to Gmail and iCloud addresses. Use "Sign up with Google" or "Sign up with Apple" for other providers.',
        });
      }

      // Full bot score, threshold and all, applies here and nowhere else. A
      // real person caught by a fuzzy signal can still get in through "Sign up
      // with Google", which is the only reason a hard block is affordable.
      const name = (ctx.body as { name?: unknown } | undefined)?.name;

      if (
        typeof name === "string" &&
        scoreSignup(name, email).score >= BOT_SCORE_THRESHOLD
      ) {
        throw new APIError("BAD_REQUEST", { message: SIGNUP_REJECTED });
      }
    }),
  },

  // The signup path writes `user` before verification, so no route-level quota
  // can see it. This is the only place these fields can be bounded.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isNameWithinLimit(user.name)) {
            throw new APIError("BAD_REQUEST", { message: "Name is too long" });
          }
          if (isDisposableEmailDomain(user.email)) {
            throw new APIError("BAD_REQUEST", {
              message: "This email provider is not supported",
            });
          }
          // Only the signals no real name can trip, because this hook also
          // fires for Google OAuth, where the name comes from a Google profile
          // and a fuzzy rejection would lock the user out of every route.
          if (scoreSignup(user.name, user.email).certain) {
            throw new APIError("BAD_REQUEST", { message: SIGNUP_REJECTED });
          }
          return { data: user };
        },
      },
    },
    // Every sign-in path funnels through here. Fires even though sessions never
    // reach Postgres: create.before runs ahead of the secondary-storage write.
    session: {
      create: {
        before: async (session) => {
          if (await isBanned(session.userId)) {
            throw new APIError("FORBIDDEN", { message: "Forbidden" });
          }
          return {
            data: {
              ...session,
              userAgent: truncateUserAgent(session.userAgent),
            },
          };
        },
      },
    },
  },

  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
    // A function because the client secret has to be signed, not read. Resolved
    // once at context creation - see APPLE_CLIENT_SECRET_TTL_SECONDS.
    apple: async () => ({
      clientId: appleClientId,
      clientSecret: await generateAppleClientSecret({
        clientId: appleClientId,
        teamId: appleTeamId,
        keyId: appleKeyId,
        privateKey: applePrivateKey,
      }),
      appBundleIdentifier: appleAppBundleIdentifier,
    }),
  },

  advanced: {
    cookiePrefix: "readometer",
  },
});

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
