import { describe, it, expect } from "vitest";
import {
  notificationEventSchema,
  NOTIFICATIONS_QUEUE_NAME,
} from "./index.ts";

const baseFields = {
  eventId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  occurredAt: "2026-07-27T12:00:00.000Z",
};

function verificationEmailRequested(overrides: Record<string, unknown> = {}) {
  return {
    ...baseFields,
    type: "verification-email-requested",
    data: {
      userId: "user-1",
      name: "Jane Reader",
      verificationUrl: "https://readometer.app/verify?token=abc",
    },
    channels: {
      email: { to: "jane@example.com" },
    },
    ...overrides,
  };
}

function passwordResetRequested(overrides: Record<string, unknown> = {}) {
  return {
    ...baseFields,
    type: "password-reset-requested",
    data: {
      userId: "user-1",
      name: null,
      resetUrl: "https://readometer.app/reset?token=abc",
    },
    channels: {
      email: { to: "jane@example.com" },
    },
    ...overrides,
  };
}

describe("notificationEventSchema", () => {
  it("accepts a valid verification-email-requested event", () => {
    const result = notificationEventSchema.safeParse(
      verificationEmailRequested(),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid password-reset-requested event", () => {
    const result = notificationEventSchema.safeParse(
      passwordResetRequested(),
    );
    expect(result.success).toBe(true);
  });

  it("accepts data.name: null", () => {
    const result = notificationEventSchema.safeParse(
      verificationEmailRequested({
        data: {
          userId: "user-1",
          name: null,
          verificationUrl: "https://readometer.app/verify?token=abc",
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an unknown type discriminant", () => {
    const result = notificationEventSchema.safeParse(
      verificationEmailRequested({ type: "goal-reminder-due" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an invalid channels.email.to address", () => {
    const result = notificationEventSchema.safeParse(
      verificationEmailRequested({
        channels: { email: { to: "not-an-email" } },
      }),
    );
    expect(result.success).toBe(false);
  });

  it.each([
    ["verificationUrl", verificationEmailRequested],
    ["resetUrl", passwordResetRequested],
  ] as const)("rejects an invalid data.%s URL", (field, build) => {
    const result = notificationEventSchema.safeParse(
      build({
        data: {
          userId: "user-1",
          name: "Jane Reader",
          [field]: "not-a-url",
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a malformed eventId", () => {
    const result = notificationEventSchema.safeParse(
      verificationEmailRequested({ eventId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a malformed occurredAt", () => {
    const result = notificationEventSchema.safeParse(
      verificationEmailRequested({ occurredAt: "not-a-datetime" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("NOTIFICATIONS_QUEUE_NAME", () => {
  it("is the hash-tagged queue name", () => {
    expect(NOTIFICATIONS_QUEUE_NAME).toBe("{notifications}");
  });
});
