import { ActiveBooksList } from "@/components/active-books-list";
import { GoalsList } from "@/components/goals-list";
import { AddBook } from "@/components/add-book";
import { InstallPrompt } from "@/components/install-prompt";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import { BookItemSkeleton } from "@/components/books-list-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { activeBooksQueryOptions } from "@/lib/books";
import { goalsProgressQueryOptions, goalsQueryOptions } from "@/lib/goals";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  component: Home,
  pendingComponent: HomeLoading,
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

function HomeLoading() {
  return (
    <>
      <HomeHeader />
      <div className="p-2 w-full grid grid-cols-1 gap-4">
        <Skeleton className="h-5 w-32" />
        <BookItemSkeleton />
        <BookItemSkeleton />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="p-2 w-full grid grid-cols-1 gap-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </>
  );
}

function Home() {
  const { data: activeBooks } = useSuspenseQuery(activeBooksQueryOptions());
  const { data: goals } = useSuspenseQuery(goalsQueryOptions());
  const { data: goalsProgress } = useSuspenseQuery(goalsProgressQueryOptions());

  return (
    <>
      <HomeHeader />
      <InstallPrompt />
      <ActiveBooksList books={activeBooks} />
      <GoalsList goals={goals} goalsProgress={goalsProgress} />
    </>
  );
}
