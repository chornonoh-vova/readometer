import { LegalLinks } from "@/components/legal-links";
import { VerifyEmailCard } from "@/components/verify-email-card";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Deliberately outside _auth: sign-up no longer creates a session, so a guarded
// route would bounce to /login and be unreachable exactly when it is needed.
export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
  validateSearch: z.object({
    email: z.email().optional(),
  }),
});

function VerifyEmail() {
  const { email } = Route.useSearch();
  return (
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyEmailCard email={email} />
        <LegalLinks />
      </div>
    </div>
  );
}
