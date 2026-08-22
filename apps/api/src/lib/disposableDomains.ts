/**
 * Disposable-inbox providers refused at signup, on top of the
 * `disposable-email-domains-js` blocklist.
 *
 * Defense in depth, explicitly not the fix. Operators rotate domains, and an
 * adversary already paying to solve Turnstile will rotate around any list. The
 * byte caps and quotas are what actually bound the damage; this only raises the
 * cost of the current wave. It also outlives the signup allowlist: if that is
 * ever widened, this still holds.
 *
 * Only domains the package does not carry belong here - `kolsea.com` is the one
 * observed in the August 2026 campaign, and neither it nor `tempmail.com` is in
 * the packaged list. Drop an entry once upstream picks it up.
 */
export const EXTRA_DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "kolsea.com",
  "tempmail.com",
]);
