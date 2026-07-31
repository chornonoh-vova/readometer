import type { Goal, GoalsProgress } from "@/lib/goals";
import { DailyGoalItem } from "./daily-goal-item";
import { YearlyGoalItem } from "./yearly-goal-item";
import { buttonVariants } from "./ui/button";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { SectionHeader } from "./section-header";

export function GoalsList({
  goals,
  goalsProgress,
}: {
  goals: Goal[];
  goalsProgress: GoalsProgress;
}) {
  const dailyGoal = goals.find((g) => g.type === "daily");
  const yearlyGoal = goals.find((g) => g.type === "yearly");

  return (
    <section className="p-2 w-full flex flex-col gap-4">
      <SectionHeader title="My goals">
        <Link to="/activity" className={buttonVariants({ variant: "link" })}>
          View all activity
          <ChevronRightIcon />
        </Link>
      </SectionHeader>

      <DailyGoalItem goal={dailyGoal} progress={goalsProgress.daily} />
      <YearlyGoalItem goal={yearlyGoal} progress={goalsProgress.yearly} />
    </section>
  );
}
