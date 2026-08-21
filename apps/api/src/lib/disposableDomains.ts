/**
 * Disposable-inbox providers refused at signup.
 *
 * Defense in depth, explicitly not the fix. Operators rotate domains, and an
 * adversary already paying to solve Turnstile will rotate around any list. The
 * byte caps and quotas are what actually bound the damage; this only raises the
 * cost of the current wave. It also outlives the signup allowlist: if that is
 * ever widened, this still holds.
 *
 * `kolsea.com` is the domain observed in the August 2026 campaign.
 *
 * Upgrade path: swap this for the `disposable-email-domains` package (~3.5k
 * entries, data-only) if the hand-maintained list proves too leaky.
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "kolsea.com",
  "10minutemail.com",
  "dispostable.com",
  "guerrillamail.com",
  "mailinator.com",
  "maildrop.cc",
  "yopmail.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "mailnesia.com",
  "fakeinbox.com",
  "mohmal.com",
  "moakt.com",
  "tempr.email",
  "emailondeck.com",
  "spam4.me",
]);
