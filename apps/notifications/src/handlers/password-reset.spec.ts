import { describe, it, expect, vi } from "vitest";
import { passwordResetRequestedEvent } from "../../test/fixtures.ts";

vi.mock("../lib/mailer.ts", () => ({
  sendMail: vi.fn(async () => undefined),
}));

import { sendMail } from "../lib/mailer.ts";
import { handlePasswordResetRequested } from "./password-reset.ts";

describe("handlePasswordResetRequested", () => {
  it("renders the password reset template and sends it to the target address", async () => {
    const event = passwordResetRequestedEvent();

    await handlePasswordResetRequested(event);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [{ to, subject, html }] = vi.mocked(sendMail).mock.calls[0]!;
    expect(to).toBe("jane@example.com");
    expect(subject).toBe("Reset your password");
    expect(html).toContain("https://readometer.app/reset?token=abc");
  });
});
