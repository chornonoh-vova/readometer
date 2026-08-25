import { importPKCS8, SignJWT } from "jose";

export const APPLE_ORIGIN = "https://appleid.apple.com";

/**
 * Apple's ceiling is six months. Long on purpose: better-auth resolves a
 * function-valued social provider once, when the auth context is built, and
 * caches it for the life of the process - a short TTL would not be refreshed,
 * it would just start failing mid-run.
 */
export const APPLE_CLIENT_SECRET_TTL_SECONDS = 180 * 24 * 60 * 60;

/** Bun's `.env` reader leaves `\n` escaped even inside double quotes. */
export function normalizeApplePrivateKey(raw: string): string {
  return raw.replaceAll("\\n", "\n").trim();
}

export type AppleClientSecretParams = {
  /** The Services ID, not the App ID. */
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
};

// Named args: transposing two of these opaque 10-character strings yields a JWT
// that verifies locally and comes back from Apple as a bare `invalid_client`.
export async function generateAppleClientSecret({
  clientId,
  teamId,
  keyId,
  privateKey,
}: AppleClientSecretParams): Promise<string> {
  const key = await importPKCS8(normalizeApplePrivateKey(privateKey), "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience(APPLE_ORIGIN)
    .setIssuedAt(now)
    .setExpirationTime(now + APPLE_CLIENT_SECRET_TTL_SECONDS)
    .sign(key);
}
