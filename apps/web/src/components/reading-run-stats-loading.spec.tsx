import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReadingRunStatsLoading } from "./reading-run-stats-loading";

describe("ReadingRunStatsLoading", () => {
  it("renders a heading placeholder and six card placeholders in a two-row, three-column grid", () => {
    const { container } = render(<ReadingRunStatsLoading />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-rows-2", "grid-cols-3");
    expect(grid?.children).toHaveLength(6);
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      7,
    );
  });
});
