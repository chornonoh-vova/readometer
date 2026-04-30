import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookProgress } from "./book-progress";

describe("BookProgress", () => {
  it("renders the X / Y label", () => {
    render(
      <BookProgress title="Refactoring" completedPages={120} totalPages={400} />,
    );
    expect(screen.getByText("120 / 400")).toBeInTheDocument();
  });

  it("includes the title for screen readers", () => {
    render(
      <BookProgress title="Refactoring" completedPages={0} totalPages={400} />,
    );
    expect(screen.getByText("Refactoring")).toHaveClass("sr-only");
  });

  it("forwards aria-valuenow from the computed percentage", () => {
    render(
      <BookProgress title="Refactoring" completedPages={50} totalPages={200} />,
    );
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "25");
  });

  it("merges a custom className with the default styles", () => {
    const { container } = render(
      <BookProgress
        title="Refactoring"
        completedPages={1}
        totalPages={10}
        className="custom-class"
      />,
    );
    expect(container.querySelector('[data-slot="progress"]')).toHaveClass(
      "custom-class",
    );
  });
});
