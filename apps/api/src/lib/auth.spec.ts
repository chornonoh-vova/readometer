import { describe, it, expect, vi, afterEach } from "vitest";
import { call } from "../../test/helpers/request";
import { makeUser } from "../../test/helpers/factories";
import { queueAddMock } from "../../test/mocks/bullmq";
import { db } from "./database";

const CAPTCHA_HEADERS = { "x-captcha-response": "test-response" };

describe("auth hooks -> notifications", () => {
  it("enqueues a verification-email-requested event on sign-up", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Jane Reader",
        email: `jane-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(queueAddMock).toHaveBeenCalledWith(
      "verification-email-requested",
      expect.objectContaining({ type: "verification-email-requested" }),
      expect.anything(),
    );
  });

  it("rejects sign-up from a domain outside the allowlist", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Nope",
        email: `nope-${crypto.randomUUID()}@proton.me`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("Gmail and iCloud");
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("rejects sign-up from the disposable domain used in the attack", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Bot",
        email: "sifafo9462@kolsea.com",
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("rejects sign-up with a name past the field limit", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "x".repeat(129),
        email: `long-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("accepts sign-up from an iCloud legacy domain", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Legacy",
        email: `legacy-${crypto.randomUUID()}@me.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
  });

  it("enqueues a password-reset-requested event for an existing user", async () => {
    const user = await makeUser({
      email: `reset-${crypto.randomUUID()}@example.com`,
    });

    const res = await call("POST", "/api/auth/request-password-reset", {
      body: { email: user.email },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(queueAddMock).toHaveBeenCalledWith(
      "password-reset-requested",
      expect.objectContaining({
        type: "password-reset-requested",
        data: expect.objectContaining({ userId: user.id }),
      }),
      expect.anything(),
    );
  });

  it("does not enqueue anything when requesting a reset for an unknown email", async () => {
    const res = await call("POST", "/api/auth/request-password-reset", {
      body: { email: `unknown-${crypto.randomUUID()}@example.com` },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(queueAddMock).not.toHaveBeenCalled();
  });
});

describe("ban gate on session creation", () => {
  async function signUpVerified(overrides: { banned?: boolean } = {}) {
    const email = `banned-${crypto.randomUUID()}@gmail.com`;
    const password = "correct-horse-battery-staple";

    const res = await call("POST", "/api/auth/sign-up/email", {
      body: { name: "Reader", email, password },
      headers: CAPTCHA_HEADERS,
    });
    expect(res.status).toBe(200);

    await db
      .updateTable("user")
      .set({ emailVerified: true, banned: overrides.banned ?? false })
      .where("email", "=", email)
      .execute();

    return { email, password };
  }

  it("refuses to create a session for a banned user", async () => {
    const { email, password } = await signUpVerified({ banned: true });

    const res = await call("POST", "/api/auth/sign-in/email", {
      body: { email, password },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Forbidden");
  });

  it("still lets an unbanned verified user sign in", async () => {
    const { email, password } = await signUpVerified({ banned: false });

    const res = await call("POST", "/api/auth/sign-in/email", {
      body: { email, password },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
  });
});

describe("bot score gate on sign-up", () => {
  it("rejects a Gmail alias whose local part is dot-fragmented", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "I will destroy YOU",
        email: "roredmcdonal.d.2335@gmail.com",
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("rejects a keyboard-mash name", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "dsjkdsa",
        email: `mash-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("rejects a name carrying markup", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: '<a href="https://evil.example">CLICK</a>',
        email: `markup-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("does not tell the caller which signal fired", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "dsjkdsa",
        email: "rangsimanphu.n.a.s.r.i@gmail.com",
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    const body = (await res.json()) as { message: string };
    expect(body.message).not.toMatch(/dot|score|mash|keyboard|signal/i);
  });

  it("accepts a Cyrillic name on an undotted Gmail address", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Оксана Шевченко",
        email: `${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
  });

  it("accepts a dotted iCloud address, where dots are significant", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Yaroslav Mudryi",
        email: `mudryi.${crypto.randomUUID()}@icloud.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
  });
});

describe("email sign-up kill switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses email sign-up when disabled", async () => {
    vi.stubEnv("EMAIL_SIGNUP_ENABLED", "false");

    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Jane Reader",
        email: `jane-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(403);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("points the caller at Google, which is still open", async () => {
    vi.stubEnv("EMAIL_SIGNUP_ENABLED", "false");

    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Jane Reader",
        email: `jane-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(/Google/);
  });

  // The switch closes the door to new accounts, not to the people who already
  // have one. Sign-in and password reset run on different paths and must not
  // notice it at all.
  it("still lets an existing verified user sign in", async () => {
    const email = `existing-${crypto.randomUUID()}@gmail.com`;
    const password = "correct-horse-battery-staple";

    const signUp = await call("POST", "/api/auth/sign-up/email", {
      body: { name: "Reader", email, password },
      headers: CAPTCHA_HEADERS,
    });
    expect(signUp.status).toBe(200);

    await db
      .updateTable("user")
      .set({ emailVerified: true })
      .where("email", "=", email)
      .execute();

    vi.stubEnv("EMAIL_SIGNUP_ENABLED", "false");

    const res = await call("POST", "/api/auth/sign-in/email", {
      body: { email, password },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
  });

  it("allows email sign-up when the variable is unset", async () => {
    const res = await call("POST", "/api/auth/sign-up/email", {
      body: {
        name: "Jane Reader",
        email: `jane-${crypto.randomUUID()}@gmail.com`,
        password: "correct-horse-battery-staple",
      },
      headers: CAPTCHA_HEADERS,
    });

    expect(res.status).toBe(200);
  });
});
