import { describe, it, expect } from "vitest";
import { sendMail } from "../src/lib/mailer.ts";

describe("sendMail (Mailpit integration)", () => {
  it("delivers the email over SMTP with no auth configured", async () => {
    const subject = `Integration test ${crypto.randomUUID()}`;

    await sendMail({
      to: "reader@example.com",
      subject,
      html: "<p>hello from the notifications worker</p>",
    });

    const res = await fetch(`${process.env.MAILPIT_HTTP_URL}/api/v1/messages`);
    const { messages } = (await res.json()) as {
      messages: { Subject: string; To: { Address: string }[] }[];
    };
    const match = messages.find((message) => message.Subject === subject);

    expect(match).toBeDefined();
    expect(match!.To[0]!.Address).toBe("reader@example.com");
  });
});
