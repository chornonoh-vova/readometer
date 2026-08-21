import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // UX only — the API's requireAuth middleware is the actual boundary.
    if (!session.user.emailVerified) {
      throw redirect({
        to: "/verify-email",
        search: {
          email: session.user.email,
          redirect: location.href,
        },
      });
    }
  },
});
