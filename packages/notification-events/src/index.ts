import { z } from "zod";

const emailTargetSchema = z.object({
  to: z.email(),
});

const baseEventSchema = z.object({
  eventId: z.uuidv4(),
  occurredAt: z.iso.datetime(),
});

export const verificationEmailRequestedSchema = baseEventSchema.extend({
  type: z.literal("verification-email-requested"),
  data: z.object({
    userId: z.string(),
    name: z.string().nullable(),
    verificationUrl: z.url(),
  }),
  channels: z.object({
    email: emailTargetSchema,
  }),
});

export const passwordResetRequestedSchema = baseEventSchema.extend({
  type: z.literal("password-reset-requested"),
  data: z.object({
    userId: z.string(),
    name: z.string().nullable(),
    resetUrl: z.url(),
  }),
  channels: z.object({
    email: emailTargetSchema,
  }),
});

export const notificationEventSchema = z.discriminatedUnion("type", [
  verificationEmailRequestedSchema,
  passwordResetRequestedSchema,
]);

export type NotificationEvent = z.infer<typeof notificationEventSchema>;

export const NOTIFICATIONS_QUEUE_NAME = "{notifications}";
