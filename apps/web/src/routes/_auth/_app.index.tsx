import { ComponentExample } from "@/components/component-example";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { booksQueryOptions } from "@/lib/books";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/_auth/_app/")({
  component: Books,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(booksQueryOptions());
  },
});

function BooksHeader() {
  return (
    <PageHeader
      name={<h1>Books</h1>}
      action={
        <Button>
          <PlusIcon />
          Add book
        </Button>
      }
    />
  );
}

function Books() {
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  console.log(books);
  return (
    <>
      <BooksHeader />
      <ComponentExample />
    </>
  );
}
