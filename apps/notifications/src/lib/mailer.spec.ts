import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createTransportMock = vi.fn(() => ({
  sendMail: vi.fn(async () => undefined),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

beforeEach(() => {
  vi.resetModules();
  createTransportMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mailer transport configuration", () => {
  it("omits auth when SMTP_USER is unset", async () => {
    vi.stubEnv("SMTP_HOST", "mailpit");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");

    await import("./mailer.ts");

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ auth: undefined }),
    );
  });

  it("includes auth when SMTP_USER is set", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.resend.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("SMTP_USER", "resend");
    vi.stubEnv("SMTP_PASS", "secret-key");

    await import("./mailer.ts");

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: "resend", pass: "secret-key" },
      }),
    );
  });
});

describe("sendMail", () => {
  it("forwards from/to/subject/html to the transport", async () => {
    vi.stubEnv("SMTP_HOST", "mailpit");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("MAIL_FROM", "noreply@readometer.local");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");

    const { sendMail } = await import("./mailer.ts");
    const transportInstance = createTransportMock.mock.results[0]!.value;

    await sendMail({
      to: "jane@example.com",
      subject: "Hi",
      html: "<p>hi</p>",
    });

    expect(transportInstance.sendMail).toHaveBeenCalledWith({
      from: "noreply@readometer.local",
      to: "jane@example.com",
      subject: "Hi",
      html: "<p>hi</p>",
    });
  });
});
