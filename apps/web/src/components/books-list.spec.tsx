import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Book } from "@/lib/books";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: { bookId: string };
  }) => <a href={`/books/${params.bookId}`}>{children}</a>,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const { BooksList } = await import("./books-list");

const makeBook = (id: string, title: string): Book => ({
  id,
  userId: "u1",
  title,
  totalPages: 100,
  completedPages: 0,
  updatedAt: "2024-01-01",
  createdAt: "2024-01-01",
  lastUpdatedAt: "2024-01-01",
  lastRunId: `${id}-run`,
});

describe("BooksList", () => {
  it("shows the empty state when no books are provided", () => {
    render(<BooksList books={[]} />);
    expect(screen.getByText("Your library is empty")).toBeInTheDocument();
  });

  it("renders a list item for each book", () => {
    render(
      <BooksList books={[makeBook("1", "Book A"), makeBook("2", "Book B")]} />,
    );
    expect(
      screen.getByText("Book A", { selector: '[data-slot="item-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Book B", { selector: '[data-slot="item-title"]' }),
    ).toBeInTheDocument();
  });

  it("does not show the empty state when books are present", () => {
    render(<BooksList books={[makeBook("1", "Book A")]} />);
    expect(screen.queryByText("Your library is empty")).not.toBeInTheDocument();
  });

  it("shows the search-empty state when hasFilters is true and there are no books", () => {
    render(<BooksList books={[]} hasFilters />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByText("Your library is empty")).not.toBeInTheDocument();
  });

  it("still shows the default empty state when hasFilters is false and there are no books", () => {
    render(<BooksList books={[]} hasFilters={false} />);
    expect(screen.getByText("Your library is empty")).toBeInTheDocument();
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
  });

  it("renders a clear filters button in the search-empty state", () => {
    render(<BooksList books={[]} hasFilters />);
    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  it("calls onClearFilters when the clear filters button is clicked", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(<BooksList books={[]} hasFilters onClearFilters={onClearFilters} />);
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
