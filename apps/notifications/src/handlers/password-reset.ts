import { render } from "react-email";

import type { NotificationEvent } from "notification-events";
import { sendMail } from "../lib/mailer.ts";
import { PasswordReset } from "../templates/password-reset.tsx";

export async function handlePasswordResetRequested(
  event: Extract<NotificationEvent, { type: "password-reset-requested" }>,
) {
  const html = await render(
    PasswordReset({ name: event.data.name, url: event.data.resetUrl }),
  );
  await sendMail({
    to: event.channels.email.to,
    subject: "Reset your password",
    html,
  });
}
