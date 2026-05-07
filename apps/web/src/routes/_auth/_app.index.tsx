import { ActiveBooksList } from "@/components/active-books-list";
import { AddBook } from "@/components/add-book";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import { activeBooksQueryOptions } from "@/lib/books";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  component: Home,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(activeBooksQueryOptions());
  },
});

function HomeHeader() {
  return (
    <PageHeader>
      <PageHeaderName>
        <h1 className="text-sm">Home</h1>
      </PageHeaderName>
      <AddBook />
    </PageHeader>
  );
}

function Home() {
  const { data: activeBooks } = useSuspenseQuery(activeBooksQueryOptions());
  return (
    <>
      <HomeHeader />
      <ActiveBooksList books={activeBooks} />
    </>
  );
}
