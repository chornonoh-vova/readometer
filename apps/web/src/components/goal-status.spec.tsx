import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalStatus } from "./goal-status";

describe("GoalStatus", () => {
  it("shows 'Not set' when no goal is configured", () => {
    render(<GoalStatus />);
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("shows progress text when goal exists but is not met", () => {
    render(<GoalStatus actual={10} target={30} metric="minutes" />);
    expect(screen.getByText(/10 \/ 30 minutes/)).toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument();
  });

  it("renders the completed badge when actual >= target", () => {
    render(<GoalStatus actual={30} target={30} metric="minutes" />);
    expect(screen.getByText(/30 \/ 30 minutes/)).toBeInTheDocument();
  });

  it("treats actual=0 with a target as in-progress, not unset", () => {
    render(<GoalStatus actual={0} target={20} metric="pages" />);
    expect(screen.getByText(/0 \/ 20 pages/)).toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument();
  });
});
