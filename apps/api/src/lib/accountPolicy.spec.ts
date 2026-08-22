import { describe, it, expect, vi, afterEach } from "vitest";
import {
  emailDomain,
  isEmailSignupEnabled,
  parseEmailSignupEnabled,
  isAllowedSignupDomain,
  isDisposableEmailDomain,
  isNameWithinLimit,
  truncateUserAgent,
} from "./accountPolicy";
import { FIELD_LIMITS } from "./limits";

describe("emailDomain", () => {
  it("extracts the domain", () => {
    expect(emailDomain("someone@example.com")).toBe("example.com");
  });

  it("lowercases and trims", () => {
    expect(emailDomain("  Someone@Example.COM  ")).toBe("example.com");
  });

  it("uses the last @ so quoted local parts do not fool it", () => {
    expect(emailDomain('"weird@thing"@example.com')).toBe("example.com");
  });
});

describe("isDisposableEmailDomain", () => {
  it("blocks the domain observed in the attack", () => {
    expect(isDisposableEmailDomain("sifafo9462@kolsea.com")).toBe(true);
  });

  it("blocks regardless of case", () => {
    expect(isDisposableEmailDomain("bot@KOLSEA.COM")).toBe(true);
  });

  it.each(["bot@mailcatch.com", "bot@grr.la", "bot@tempmailo.com"])(
    "blocks %s from the packaged blocklist",
    (email) => {
      expect(isDisposableEmailDomain(email)).toBe(true);
    },
  );

  it("allows ordinary providers", () => {
    expect(isDisposableEmailDomain("real.person@gmail.com")).toBe(false);
    expect(isDisposableEmailDomain("real.person@proton.me")).toBe(false);
    expect(isDisposableEmailDomain("real.person@fastmail.com")).toBe(false);
  });

  it("does not block a subdomain lookalike it has no entry for", () => {
    expect(isDisposableEmailDomain("bot@mail.kolsea.com")).toBe(false);
  });
});

describe("isAllowedSignupDomain", () => {
  it.each([
    "a@gmail.com",
    "a@googlemail.com",
    "a@icloud.com",
    "a@me.com",
    "a@mac.com",
  ])("allows %s", (email) => {
    expect(isAllowedSignupDomain(email)).toBe(true);
  });

  it.each([
    "a@proton.me",
    "a@outlook.com",
    "a@fastmail.com",
    "a@kolsea.com",
    "a@example.com",
  ])("rejects %s", (email) => {
    expect(isAllowedSignupDomain(email)).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isAllowedSignupDomain("A@GMAIL.COM")).toBe(true);
  });

  it("does not allow a subdomain of an allowed domain", () => {
    expect(isAllowedSignupDomain("a@mail.gmail.com")).toBe(false);
  });
});

describe("isNameWithinLimit", () => {
  it("accepts a name at the limit", () => {
    expect(isNameWithinLimit("x".repeat(FIELD_LIMITS.userName))).toBe(true);
  });

  it("rejects a name one over the limit", () => {
    expect(isNameWithinLimit("x".repeat(FIELD_LIMITS.userName + 1))).toBe(
      false,
    );
  });

  it("rejects the multi-megabyte name used to fill the database", () => {
    expect(isNameWithinLimit("x".repeat(10_000_000))).toBe(false);
  });
});

describe("truncateUserAgent", () => {
  it("passes a normal user agent through unchanged", () => {
    const ua = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36";
    expect(truncateUserAgent(ua)).toBe(ua);
  });

  it("truncates rather than rejecting an oversized header", () => {
    const result = truncateUserAgent("x".repeat(10_000));
    expect(result).toHaveLength(FIELD_LIMITS.userAgent);
  });

  it("maps null and undefined to null", () => {
    expect(truncateUserAgent(null)).toBeNull();
    expect(truncateUserAgent(undefined)).toBeNull();
  });
});

describe("parseEmailSignupEnabled", () => {
  it.each([undefined, "", "   "])("defaults to enabled for %p", (raw) => {
    expect(parseEmailSignupEnabled(raw)).toBe(true);
  });

  it.each(["true", "TRUE", " True ", "1"])("reads %p as enabled", (raw) => {
    expect(parseEmailSignupEnabled(raw)).toBe(true);
  });

  it.each(["false", "FALSE", " False ", "0"])("reads %p as disabled", (raw) => {
    expect(parseEmailSignupEnabled(raw)).toBe(false);
  });

  // A kill switch that silently stays open because someone wrote "no" is worse
  // than one that refuses to start.
  it.each(["no", "yes", "off", "on", "disabled", "maybe"])(
    "throws rather than guessing at %p",
    (raw) => {
      expect(() => parseEmailSignupEnabled(raw)).toThrow(
        /EMAIL_SIGNUP_ENABLED/,
      );
    },
  );
});

describe("isEmailSignupEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled when the variable is unset", () => {
    expect(isEmailSignupEnabled()).toBe(true);
  });

  it("follows the variable", () => {
    vi.stubEnv("EMAIL_SIGNUP_ENABLED", "false");
    expect(isEmailSignupEnabled()).toBe(false);
  });
});
