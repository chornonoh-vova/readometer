import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BooksSearchEmpty } from "./books-search-empty";

describe("BooksSearchEmpty", () => {
  it("renders the no books found heading", () => {
    render(<BooksSearchEmpty />);
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("renders the descriptive message", () => {
    render(<BooksSearchEmpty />);
    expect(
      screen.getByText(
        "Nothing matched your search. Try different keywords or clear your filters.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the clear filters button", () => {
    render(<BooksSearchEmpty />);
    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  it("calls onClear when the clear filters button is clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<BooksSearchEmpty onClear={onClear} />);
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
