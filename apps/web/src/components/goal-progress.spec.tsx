import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalProgress } from "./goal-progress";

describe("GoalProgress", () => {
  it("shows 0% when actual and target are not set", () => {
    render(<GoalProgress />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders the rounded percentage based on actual / target", () => {
    render(<GoalProgress actual={18} target={30} metric="minutes" />);
    // 18 / 30 = 60%
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("floors fractional progress to whole percent", () => {
    render(<GoalProgress actual={2} target={3} metric="books" />);
    // 2/3 = 66.66 → floored 66%
    expect(screen.getByText("66%")).toBeInTheDocument();
  });

  it("renders an accessible label including actual, target, and metric", () => {
    render(<GoalProgress actual={3} target={12} metric="books" />);
    expect(screen.getByText("3 / 12 books")).toBeInTheDocument();
  });

  it("omits the label when metric is missing (no goal configured)", () => {
    render(<GoalProgress actual={3} target={12} />);
    expect(screen.queryByText(/\/ 12/)).not.toBeInTheDocument();
  });
});
