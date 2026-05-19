import { ActiveBooksList } from "@/components/active-books-list";
import { DailyGoalItem } from "@/components/daily-goal-item";
import { YearlyGoalItem } from "@/components/yearly-goal-item";
import { AddBook } from "@/components/add-book";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import { activeBooksQueryOptions } from "@/lib/books";
import { goalsProgressQueryOptions, goalsQueryOptions } from "@/lib/goals";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { ChevronRightIcon } from "lucide-react";

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

  const dailyGoal = goals.find((g) => g.type === "daily");
  const yearlyGoal = goals.find((g) => g.type === "yearly");

  return (
    <>
      <HomeHeader />
      <ActiveBooksList books={activeBooks} />
      <section className="p-2 w-full grid grid-cols-1 gap-4">
        <h2 className="text-md">Goals</h2>
        <DailyGoalItem goal={dailyGoal} progress={goalsProgress.daily} />
        <YearlyGoalItem goal={yearlyGoal} progress={goalsProgress.yearly} />
        <Link
          to="/activity"
          className={buttonVariants({ variant: "secondary" })}
        >
          View all activity
          <ChevronRightIcon />
        </Link>
      </section>
    </>
  );
}
