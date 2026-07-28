import { render } from "react-email";

import type { NotificationEvent } from "notification-events";
import { sendMail } from "../lib/mailer.ts";
import { VerificationEmail } from "../templates/verification-email.tsx";

export async function handleVerificationEmailRequested(
  event: Extract<NotificationEvent, { type: "verification-email-requested" }>,
) {
  const html = await render(
    VerificationEmail({
      name: event.data.name,
      url: event.data.verificationUrl,
    }),
  );
  await sendMail({
    to: event.channels.email.to,
    subject: "Verify your email",
    html,
  });
}
