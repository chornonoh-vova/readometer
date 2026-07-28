import { handleVerificationEmailRequested } from "./verification-email.ts";
import { handlePasswordResetRequested } from "./password-reset.ts";

export const handlers = {
  "verification-email-requested": handleVerificationEmailRequested,
  "password-reset-requested": handlePasswordResetRequested,
};
