import { isDisposableEmail } from "disposable-email-domains-js";
import { EXTRA_DISPOSABLE_EMAIL_DOMAINS } from "./disposableDomains.ts";
import { FIELD_LIMITS } from "./limits.ts";

/** The part after the final `@`, normalised for comparison. */
export function emailDomain(email: string): string {
  return email
    .slice(email.lastIndexOf("@") + 1)
    .trim()
    .toLowerCase();
}

export function isDisposableEmailDomain(email: string): boolean {
  return (
    isDisposableEmail(email) ||
    EXTRA_DISPOSABLE_EMAIL_DOMAINS.has(emailDomain(email))
  );
}

/**
 * Providers allowed to register with email and password.
 *
 * `me.com` and `mac.com` are here because iCloud issues addresses on all three
 * Apple domains and older accounts often have only a legacy one; allowing
 * `icloud.com` alone would silently reject real iCloud users.
 *
 * Everyone else signs in with Google. Enforced ONLY on `/sign-up/email` - see
 * the note in auth.ts about why this cannot live in a `user.create` hook.
 */
export const ALLOWED_SIGNUP_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "mac.com",
]);

export function isAllowedSignupDomain(email: string): boolean {
  return ALLOWED_SIGNUP_DOMAINS.has(emailDomain(email));
}

const TRUTHY = new Set(["true", "1"]);
const FALSY = new Set(["false", "0"]);

/**
 * Throws rather than guessing. A kill switch left open because someone wrote
 * "no" instead of "false" is worse than one that refuses to start.
 */
export function parseEmailSignupEnabled(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase();
  if (!value) return true;

  if (TRUTHY.has(value)) return true;
  if (FALSY.has(value)) return false;

  throw new Error(
    `EMAIL_SIGNUP_ENABLED must be true, false, 1, or 0, got ${JSON.stringify(raw)}`,
  );
}

/**
 * Last resort for an ongoing campaign: shuts the email sign-up route entirely,
 * leaving Google as the only way to make an account.
 *
 * Read per request rather than at startup so tests can flip it, and so the
 * blast radius of a bad value is one 500 on the sign-up route rather than a
 * process that will not boot.
 *
 * Scoped to account creation only. Sign-in and password reset run on other
 * paths and stay open - the people who already have accounts did nothing wrong.
 */
export function isEmailSignupEnabled(): boolean {
  return parseEmailSignupEnabled(process.env.EMAIL_SIGNUP_ENABLED);
}

export function isNameWithinLimit(name: string): boolean {
  return name.length <= FIELD_LIMITS.userName;
}

/**
 * `session.userAgent` is unbounded `text` fed straight from a request header.
 * Truncated rather than rejected: an odd UA is not a reason to fail a login.
 */
export function truncateUserAgent(
  ua: string | null | undefined,
): string | null {
  if (!ua) return null;
  return ua.length <= FIELD_LIMITS.userAgent
    ? ua
    : ua.slice(0, FIELD_LIMITS.userAgent);
}
