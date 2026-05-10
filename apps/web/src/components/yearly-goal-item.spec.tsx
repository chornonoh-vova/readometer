import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { YearlyGoal, YearlyGoalProgress } from "@/lib/goals";

vi.mock("./setup-yearly-goal", () => ({
  SetupYearlyGoal: ({ id, current }: { id?: string; current?: number }) => (
    <button
      type="button"
      data-testid="setup-yearly-goal"
      data-id={id ?? ""}
      data-current={current ?? ""}
    >
      Setup
    </button>
  ),
}));

const { YearlyGoalItem } = await import("./yearly-goal-item");

const goal: YearlyGoal = {
  id: "g2",
  userId: "u1",
  type: "yearly",
  metric: "books",
  target: 12,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const progress: YearlyGoalProgress = {
  goal: { type: "yearly", metric: "books", target: 12 },
  actual: 3,
};

describe("YearlyGoalItem", () => {
  it("renders the title 'Yearly reading goal'", () => {
    render(<YearlyGoalItem goal={goal} progress={progress} />);
    expect(screen.getByText("Yearly reading goal")).toBeInTheDocument();
  });

  it("shows the progress label '3 / 12 books' in the status badge", () => {
    render(<YearlyGoalItem goal={goal} progress={progress} />);
    const badge = document.querySelector('[data-slot="badge"]');
    expect(badge).toHaveTextContent(/3 \/ 12 books/);
  });

  it("renders 'Not set' when no goal is configured", () => {
    render(<YearlyGoalItem />);
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("passes id/current to the SetupYearlyGoal trigger", () => {
    render(<YearlyGoalItem goal={goal} progress={progress} />);
    const trigger = screen.getByTestId("setup-yearly-goal");
    expect(trigger).toHaveAttribute("data-id", "g2");
    expect(trigger).toHaveAttribute("data-current", "12");
  });
});
