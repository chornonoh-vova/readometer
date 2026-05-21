import type { Goal, GoalsProgress } from "@/lib/goals";
import { DailyGoalItem } from "./daily-goal-item";
import { YearlyGoalItem } from "./yearly-goal-item";
import { buttonVariants } from "./ui/button";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/animations";

const list = listVariants();

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
    <motion.section
      className="p-2 w-full grid grid-cols-1 gap-4"
      variants={list}
      initial="hidden"
      animate="show"
    >
      <motion.h2 className="text-md" variants={itemVariants}>
        Goals
      </motion.h2>
      <motion.div variants={itemVariants}>
        <DailyGoalItem goal={dailyGoal} progress={goalsProgress.daily} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <YearlyGoalItem goal={yearlyGoal} progress={goalsProgress.yearly} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Link
          to="/activity"
          className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
        >
          View all activity
          <ChevronRightIcon />
        </Link>
      </motion.div>
    </motion.section>
  );
}
