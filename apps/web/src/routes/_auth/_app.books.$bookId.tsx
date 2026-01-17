import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/books/$bookId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { bookId } = Route.useParams();
  return <div>Hello "/_auth/_app/books/$bookId"! {bookId}</div>;
}
