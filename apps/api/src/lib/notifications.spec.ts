import { describe, it, expect } from "vitest";
import { notificationEventSchema } from "notification-events";
import { queueAddMock, queueConstructorMock } from "../../test/mocks/bullmq";
import { publishNotification } from "./notifications";

describe("publishNotification", () => {
  it("enqueues a verification-email-requested event", async () => {
    await publishNotification({
      type: "verification-email-requested",
      data: {
        userId: "user-1",
        name: "Jane Reader",
        verificationUrl: "https://readometer.app/verify?token=abc",
      },
      channels: { email: { to: "jane@example.com" } },
    });

    expect(queueAddMock).toHaveBeenCalledTimes(1);
    const [name, payload, opts] = queueAddMock.mock.calls[0]!;
    expect(name).toBe("verification-email-requested");
    expect(opts).toMatchObject({
      jobId: (payload as { eventId: string }).eventId,
    });
    expect(notificationEventSchema.safeParse(payload).success).toBe(true);
  });

  it("enqueues a password-reset-requested event", async () => {
    await publishNotification({
      type: "password-reset-requested",
      data: {
        userId: "user-1",
        name: null,
        resetUrl: "https://readometer.app/reset?token=abc",
      },
      channels: { email: { to: "jane@example.com" } },
    });

    expect(queueAddMock).toHaveBeenCalledTimes(1);
    const [name, payload, opts] = queueAddMock.mock.calls[0]!;
    expect(name).toBe("password-reset-requested");
    expect(opts).toMatchObject({
      jobId: (payload as { eventId: string }).eventId,
    });
    expect(notificationEventSchema.safeParse(payload).success).toBe(true);
  });

  it("generates a valid eventId and occurredAt", async () => {
    await publishNotification({
      type: "verification-email-requested",
      data: {
        userId: "user-1",
        name: "Jane Reader",
        verificationUrl: "https://readometer.app/verify?token=abc",
      },
      channels: { email: { to: "jane@example.com" } },
    });

    const [, payload] = queueAddMock.mock.calls[0]!;
    const parsed = notificationEventSchema.parse(payload);
    expect(parsed.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(new Date(parsed.occurredAt).toISOString()).toBe(parsed.occurredAt);
  });

  it("throws when the event payload is invalid", async () => {
    await expect(
      publishNotification({
        type: "verification-email-requested",
        // @ts-expect-error deliberately missing required data.userId
        data: {
          name: "Jane Reader",
          verificationUrl: "https://readometer.app/verify?token=abc",
        },
        channels: { email: { to: "jane@example.com" } },
      }),
    ).rejects.toThrow();
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("configures the queue with 5 retries and exponential backoff", () => {
    expect(queueConstructorMock).toHaveBeenCalledTimes(1);
    const [, opts] = queueConstructorMock.mock.calls[0]!;
    expect(opts).toMatchObject({
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
  });
});
