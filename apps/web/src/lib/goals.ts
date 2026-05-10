import { queryOptions, useMutation } from "@tanstack/react-query";
import { fetchApi } from "./api";
import { goals } from "./query-keys";
import { formatDate } from "./format";

export type DailyMetric = "minutes" | "pages";
export type YearlyMetric = "books";

type GoalCommon = {
  id: string;
  userId: string;
  target: number;
  createdAt: string;
  updatedAt: string;
};

export type DailyGoal = GoalCommon & {
  type: "daily";
  metric: DailyMetric;
};

export type YearlyGoal = GoalCommon & {
  type: "yearly";
  metric: YearlyMetric;
};

export type Goal = DailyGoal | YearlyGoal;

export type DailyGoalProgress = {
  goal: Pick<DailyGoal, "metric" | "type" | "target">;
  actual: number;
};

export type YearlyGoalProgress = {
  goal: Pick<YearlyGoal, "metric" | "type" | "target">;
  actual: number;
};

export type GoalsProgress = {
  daily?: DailyGoalProgress;
  yearly?: YearlyGoalProgress;
};

async function fetchGoals(): Promise<Goal[]> {
  return fetchApi("/goals");
}

export function goalsQueryOptions() {
  return queryOptions({
    queryKey: goals.list,
    queryFn: fetchGoals,
  });
}

async function fetchGoalsProgress(
  date: string,
  tz: string,
): Promise<GoalsProgress> {
  const searchParams = new URLSearchParams({ date, tz });
  return fetchApi(`/goals/progress?${searchParams}`);
}

export function goalsProgressQueryOptions() {
  const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = formatDate(new Date());
  return queryOptions({
    queryKey: goals.progress(date, tz),
    queryFn: () => fetchGoalsProgress(date, tz),
  });
}

export type UpsertGoal = Pick<Goal, "id" | "type" | "metric" | "target">;

async function upsertGoal(goal: UpsertGoal): Promise<Goal> {
  return fetchApi("/goals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(goal),
  });
}

export function useUpsertGoalMutation() {
  return useMutation({
    mutationFn: (goal: UpsertGoal) => upsertGoal(goal),

    onSuccess: (_data, _variables, _onMutateResult, context) => {
      context.client.invalidateQueries({
        queryKey: goals.list,
      });
    },
  });
}

async function deleteGoal(goalId: string): Promise<void> {
  return fetchApi(`/goals/${goalId}`, {
    method: "DELETE",
    noContent: true,
  });
}

export function useDeleteGoalMutation() {
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),

    onSuccess: (_data, _variables, _onMutateResult, context) => {
      context.client.invalidateQueries({
        queryKey: goals.list,
      });
    },
  });
}
