import type { NotificationEvent } from "notification-events";

export function verificationEmailRequestedEvent(
  overrides: Partial<
    Extract<NotificationEvent, { type: "verification-email-requested" }>
  > = {},
): Extract<NotificationEvent, { type: "verification-email-requested" }> {
  return {
    eventId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    occurredAt: "2026-07-27T12:00:00.000Z",
    type: "verification-email-requested",
    data: {
      userId: "user-1",
      name: "Jane Reader",
      verificationUrl: "https://readometer.app/verify?token=abc",
    },
    channels: { email: { to: "jane@example.com" } },
    ...overrides,
  };
}

export function passwordResetRequestedEvent(
  overrides: Partial<
    Extract<NotificationEvent, { type: "password-reset-requested" }>
  > = {},
): Extract<NotificationEvent, { type: "password-reset-requested" }> {
  return {
    eventId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    occurredAt: "2026-07-27T12:00:00.000Z",
    type: "password-reset-requested",
    data: {
      userId: "user-1",
      name: null,
      resetUrl: "https://readometer.app/reset?token=abc",
    },
    channels: { email: { to: "jane@example.com" } },
    ...overrides,
  };
}
