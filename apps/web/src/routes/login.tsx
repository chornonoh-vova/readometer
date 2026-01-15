import { LoginForm } from "@/components/login-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: z.object({
    redirect: z.string().optional().prefault("/"),
  }),
});

function Login() {
  const { redirect } = Route.useSearch();
  return (
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirect={redirect} />
      </div>
    </div>
  );
}
