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
        email: `jane-${crypto.randomUUID()}@example.com`,
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
