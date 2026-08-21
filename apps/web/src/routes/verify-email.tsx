import { LegalLinks } from "@/components/legal-links";
import { VerifyEmailCard, safeRedirect } from "@/components/verify-email-card";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Outside _auth: sign-up creates no session, so a guarded route is unreachable.
export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
  validateSearch: z.object({
    email: z.email().optional(),
    error: z.string().optional(),
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ search }) => {
    // Verification links land here, so send anyone already verified onward.
    const { data: session } = await authClient.getSession();
    if (session?.user.emailVerified) {
      throw redirect({ to: safeRedirect(search.redirect) });
    }
  },
});

function VerifyEmail() {
  const { email, error, redirect: redirectTo } = Route.useSearch();
  return (
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyEmailCard email={email} error={error} redirect={redirectTo} />
        <LegalLinks />
      </div>
    </div>
  );
}
