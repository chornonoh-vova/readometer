import { ComponentExample } from "@/components/component-example";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/")({
  component: Index,
});

function Index() {
  const navigate = Route.useNavigate();
  const logout = async () => {
    await authClient.signOut();
    navigate({
      to: "/login",
    });
  };
  return (
    <>
      <Button onClick={logout}>Logout</Button>
      <ComponentExample />
    </>
  );
}
