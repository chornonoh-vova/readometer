import type { DailyGoal, DailyGoalProgress } from "@/lib/goals";
import { GoalItem } from "./goal-item";
import { SetupDailyGoal } from "./setup-daily-goal";

export function DailyGoalItem({
  goal,
  progress,
}: {
  goal?: DailyGoal;
  progress?: DailyGoalProgress;
}) {
  return (
    <GoalItem
      title="Daily reading goal"
      actual={progress?.actual}
      target={goal?.target}
      metric={goal?.metric}
    >
      <SetupDailyGoal
        id={goal?.id}
        current={goal?.target}
        metric={goal?.metric}
      />
    </GoalItem>
  );
}
