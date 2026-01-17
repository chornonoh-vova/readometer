import { AddBook } from "@/components/add-book";
import { BooksList } from "@/components/books-list";
import { PageHeader } from "@/components/page-header";
import { booksQueryOptions } from "@/lib/books";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  component: Books,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(booksQueryOptions());
  },
});

function BooksHeader() {
  return <PageHeader name={<h1>Books</h1>} action={<AddBook />} />;
}

function Books() {
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  console.log(books);
  return (
    <>
      <BooksHeader />
      <BooksList books={books} />
    </>
  );
}
