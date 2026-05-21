import { ActiveBooksList } from "@/components/active-books-list";
import { GoalsList } from "@/components/goals-list";
import { AddBook } from "@/components/add-book";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import { activeBooksQueryOptions } from "@/lib/books";
import { goalsProgressQueryOptions, goalsQueryOptions } from "@/lib/goals";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  component: Home,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(activeBooksQueryOptions()),
      context.queryClient.ensureQueryData(goalsQueryOptions()),
      context.queryClient.ensureQueryData(goalsProgressQueryOptions()),
    ]),
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
  const { data: goals } = useSuspenseQuery(goalsQueryOptions());
  const { data: goalsProgress } = useSuspenseQuery(goalsProgressQueryOptions());

  return (
    <>
      <HomeHeader />
      <ActiveBooksList books={activeBooks} />
      <GoalsList goals={goals} goalsProgress={goalsProgress} />
    </>
  );
}
