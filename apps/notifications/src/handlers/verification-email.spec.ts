import { describe, it, expect, vi } from "vitest";
import { verificationEmailRequestedEvent } from "../../test/fixtures.ts";

vi.mock("../lib/mailer.ts", () => ({
  sendMail: vi.fn(async () => undefined),
}));

import { sendMail } from "../lib/mailer.ts";
import { handleVerificationEmailRequested } from "./verification-email.ts";

describe("handleVerificationEmailRequested", () => {
  it("renders the verification template and sends it to the target address", async () => {
    const event = verificationEmailRequestedEvent();

    await handleVerificationEmailRequested(event);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [{ to, subject, html }] = vi.mocked(sendMail).mock.calls[0]!;
    expect(to).toBe("jane@example.com");
    expect(subject).toBe("Verify your email");
    expect(html).toContain("https://readometer.app/verify?token=abc");
  });
});
