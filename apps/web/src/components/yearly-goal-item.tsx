import type { YearlyGoal, YearlyGoalProgress } from "@/lib/goals";
import { GoalItem } from "./goal-item";
import { SetupYearlyGoal } from "./setup-yearly-goal";

export function YearlyGoalItem({
  goal,
  progress,
}: {
  goal?: YearlyGoal;
  progress?: YearlyGoalProgress;
}) {
  return (
    <GoalItem
      title="Yearly reading goal"
      actual={progress?.actual}
      target={goal?.target}
      metric={goal?.metric}
    >
      <SetupYearlyGoal id={goal?.id} current={goal?.target} />
    </GoalItem>
  );
}
