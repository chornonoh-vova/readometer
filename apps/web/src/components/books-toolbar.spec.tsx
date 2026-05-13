import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BooksStatusFilter } from "@/lib/books";

const { BooksToolbar } = await import("./books-toolbar");

const defaultProps = {
  search: "",
  onSearchChange: vi.fn(),
  statusFilter: "all" as BooksStatusFilter,
  onStatusFilterChange: vi.fn(),
};

describe("BooksToolbar", () => {
  it("renders the search input", () => {
    render(<BooksToolbar {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search by title or author…"),
    ).toBeInTheDocument();
  });

  it("calls onSearchChange with the new value when the input changes", () => {
    const onSearchChange = vi.fn();
    render(<BooksToolbar {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(
      screen.getByPlaceholderText("Search by title or author…"),
      {
        target: { value: "gatsby" },
      },
    );
    expect(onSearchChange).toHaveBeenCalledWith("gatsby");
  });

  it("does not show the clear button when search is empty", () => {
    render(<BooksToolbar {...defaultProps} search="" />);
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();
  });

  it("shows the clear button when search is non-empty", () => {
    render(<BooksToolbar {...defaultProps} search="gatsby" />);
    expect(
      screen.getByRole("button", { name: "Clear search" }),
    ).toBeInTheDocument();
  });

  it("calls onSearchChange with empty string when the clear button is clicked", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <BooksToolbar
        {...defaultProps}
        search="gatsby"
        onSearchChange={onSearchChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("renders the filter button", () => {
    render(<BooksToolbar {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Filter by status" }),
    ).toBeInTheDocument();
  });

  it("shows status options when the filter button is clicked", async () => {
    const user = userEvent.setup();
    render(<BooksToolbar {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: "Filter by status" }));
    expect(await screen.findByText("To Read")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("calls onStatusFilterChange with the selected value when an option is clicked", async () => {
    const user = userEvent.setup();
    const onStatusFilterChange = vi.fn();
    render(
      <BooksToolbar
        {...defaultProps}
        onStatusFilterChange={onStatusFilterChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter by status" }));
    await user.click(await screen.findByText("In Progress"));
    expect(onStatusFilterChange).toHaveBeenCalledWith("in-progress");
  });
});
