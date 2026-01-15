import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/stats")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_auth/_app/stats"!</div>;
}
