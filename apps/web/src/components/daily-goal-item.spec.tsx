import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DailyGoal, DailyGoalProgress } from "@/lib/goals";

vi.mock("./setup-daily-goal", () => ({
  SetupDailyGoal: ({
    id,
    current,
    metric,
  }: {
    id?: string;
    current?: number;
    metric?: string;
  }) => (
    <button
      type="button"
      data-testid="setup-daily-goal"
      data-id={id ?? ""}
      data-current={current ?? ""}
      data-metric={metric ?? ""}
    >
      Setup
    </button>
  ),
}));

const { DailyGoalItem } = await import("./daily-goal-item");

const goal: DailyGoal = {
  id: "g1",
  userId: "u1",
  type: "daily",
  metric: "minutes",
  target: 30,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const progress: DailyGoalProgress = {
  goal: { type: "daily", metric: "minutes", target: 30 },
  actual: 18,
};

describe("DailyGoalItem", () => {
  it("renders the title 'Daily reading goal'", () => {
    render(<DailyGoalItem goal={goal} progress={progress} />);
    expect(screen.getByText("Daily reading goal")).toBeInTheDocument();
  });

  it("shows the progress label '18 / 30 minutes' in the status badge", () => {
    render(<DailyGoalItem goal={goal} progress={progress} />);
    const badge = document.querySelector('[data-slot="badge"]');
    expect(badge).toHaveTextContent(/18 \/ 30 minutes/);
  });

  it("renders 'Not set' when no goal is configured", () => {
    render(<DailyGoalItem />);
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("passes id/current/metric to the SetupDailyGoal trigger", () => {
    render(<DailyGoalItem goal={goal} progress={progress} />);
    const trigger = screen.getByTestId("setup-daily-goal");
    expect(trigger).toHaveAttribute("data-id", "g1");
    expect(trigger).toHaveAttribute("data-current", "30");
    expect(trigger).toHaveAttribute("data-metric", "minutes");
  });

  it("passes no id to the SetupDailyGoal trigger when there is no goal yet", () => {
    render(<DailyGoalItem />);
    const trigger = screen.getByTestId("setup-daily-goal");
    expect(trigger).toHaveAttribute("data-id", "");
  });
});
