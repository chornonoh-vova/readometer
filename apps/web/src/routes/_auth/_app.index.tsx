import { AddBook } from "@/components/add-book";
import { BooksList } from "@/components/books-list";
import { BooksListLoading } from "@/components/books-list-loading";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import { booksQueryOptions } from "@/lib/books";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  component: Books,
  pendingComponent: BooksLoading,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(booksQueryOptions());
  },
});

function BooksHeader() {
  return (
    <PageHeader>
      <PageHeaderName>
        <h1 className="text-sm">Books</h1>
      </PageHeaderName>
      <AddBook />
    </PageHeader>
  );
}

function BooksLoading() {
  return (
    <>
      <BooksHeader />
      <BooksListLoading />
    </>
  );
}

function Books() {
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  return (
    <>
      <BooksHeader />
      <BooksList books={books} />
    </>
  );
}
