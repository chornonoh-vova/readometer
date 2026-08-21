import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";
import { makeUser } from "../../test/helpers/factories";
import { queueAddMock } from "../../test/mocks/bullmq";

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
