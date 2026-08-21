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
    // Without this the shell would render and every query would 403.
    if (!session.user.emailVerified) {
      throw redirect({
        to: "/verify-email",
        search: {
          email: session.user.email,
        },
      });
    }
  },
});
