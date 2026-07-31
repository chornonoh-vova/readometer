import { ActiveBooksList } from "@/components/active-books-list";
import { GoalsList } from "@/components/goals-list";
import { AddBook } from "@/components/add-book";
import { InstallPrompt } from "@/components/install-prompt";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import {
  BookItemSkeleton,
  CompactBookItemSkeleton,
} from "@/components/books-list-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { activeBooksQueryOptions } from "@/lib/books";
import { timeOfDayEmoji } from "@/lib/format";
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
        <h1 className="sr-only">Home</h1>
        <p className="text-sm">
          Happy reading{" "}
          <span aria-hidden="true">{timeOfDayEmoji(new Date())}</span>
        </p>
      </PageHeaderName>
      <AddBook variant="outline" />
    </PageHeader>
  );
}

function HomeLoading() {
  return (
    <>
      <HomeHeader />
      <div className="p-2 w-full flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <BookItemSkeleton />

        <div className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex flex-row gap-2 overflow-hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <CompactBookItemSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="p-2 w-full flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
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
