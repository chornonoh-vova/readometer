import { describe, expect, it } from "vitest";
import {
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
  decodeProtectedHeader,
  type CryptoKey,
} from "jose";
import {
  APPLE_CLIENT_SECRET_TTL_SECONDS,
  APPLE_ORIGIN,
  generateAppleClientSecret,
  normalizeApplePrivateKey,
} from "./appleAuth.ts";

async function keypair() {
  const { privateKey, publicKey } = await generateKeyPair("ES256", {
    extractable: true,
  });
  return { pem: await exportPKCS8(privateKey), publicKey };
}

const PARAMS = {
  clientId: "app.readometer.services",
  teamId: "TEAM123456",
  keyId: "KEY1234567",
};

describe("normalizeApplePrivateKey", () => {
  it("expands backslash-escaped newlines", () => {
    const normalized = normalizeApplePrivateKey(
      "-----BEGIN PRIVATE KEY-----\\nMIGT\\n-----END PRIVATE KEY-----",
    );

    expect(normalized).toBe(
      "-----BEGIN PRIVATE KEY-----\nMIGT\n-----END PRIVATE KEY-----",
    );
  });

  it("leaves a PEM that already has real newlines alone", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nMIGT\n-----END PRIVATE KEY-----";

    expect(normalizeApplePrivateKey(pem)).toBe(pem);
  });

  it("trims the surrounding whitespace a copy-paste leaves behind", () => {
    expect(normalizeApplePrivateKey("  \n-----BEGIN-----\n  ")).toBe(
      "-----BEGIN-----",
    );
  });
});

describe("generateAppleClientSecret", () => {
  async function mint(privateKey: string) {
    return generateAppleClientSecret({ ...PARAMS, privateKey });
  }

  async function claims(jwt: string, publicKey: CryptoKey) {
    const { payload } = await jwtVerify(jwt, publicKey, {
      issuer: PARAMS.teamId,
      audience: APPLE_ORIGIN,
    });
    return payload;
  }

  it("signs a JWT the matching public key verifies", async () => {
    const { pem, publicKey } = await keypair();

    await expect(claims(await mint(pem), publicKey)).resolves.toBeDefined();
  });

  it("declares ES256 and the key id in the protected header", async () => {
    const { pem } = await keypair();

    expect(decodeProtectedHeader(await mint(pem))).toEqual({
      alg: "ES256",
      kid: PARAMS.keyId,
    });
  });

  it("issues from the team id and subjects the client id", async () => {
    const { pem, publicKey } = await keypair();

    const payload = await claims(await mint(pem), publicKey);

    expect(payload.iss).toBe(PARAMS.teamId);
    expect(payload.sub).toBe(PARAMS.clientId);
    expect(payload.aud).toBe(APPLE_ORIGIN);
  });

  it("expires within the six months Apple allows", async () => {
    const { pem, publicKey } = await keypair();

    const payload = await claims(await mint(pem), publicKey);

    expect(payload.exp! - payload.iat!).toBe(APPLE_CLIENT_SECRET_TTL_SECONDS);
    // Six months, Apple's hard ceiling on `exp`.
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(15_777_000);
  });

  it("accepts a PEM whose newlines arrived escaped", async () => {
    const { pem, publicKey } = await keypair();

    const jwt = await mint(pem.replaceAll("\n", "\\n"));

    await expect(claims(jwt, publicKey)).resolves.toBeDefined();
  });

  it("rejects a private key that is not a PKCS#8 PEM", async () => {
    await expect(mint("not-a-key")).rejects.toThrow();
  });
});
