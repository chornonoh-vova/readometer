import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Book } from "@/lib/books";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("./active-book-item", () => ({
  ActiveBookItem: ({ book }: { book: Book }) => (
    <div data-testid="active-book-item">{book.title}</div>
  ),
}));

vi.mock("./active-books-empty", () => ({
  ActiveBooksEmpty: () => <div>No active books</div>,
}));

const { ActiveBooksList } = await import("./active-books-list");

const makeBook = (id: string, title: string): Book => ({
  id,
  userId: "u1",
  title,
  totalPages: 200,
  completedPages: 50,
  updatedAt: "2024-01-01",
  createdAt: "2024-01-01",
  lastUpdatedAt: "2024-01-01",
  lastRunId: `${id}-run`,
});

describe("ActiveBooksList", () => {
  it("shows the empty state when no books are provided", () => {
    render(<ActiveBooksList books={[]} />);
    expect(screen.getByText("No active books")).toBeInTheDocument();
  });

  it("does not show the continue reading heading when books list is empty", () => {
    render(<ActiveBooksList books={[]} />);
    expect(screen.queryByText("Continue reading")).not.toBeInTheDocument();
  });

  it("renders an item for each book", () => {
    render(
      <ActiveBooksList
        books={[makeBook("1", "Book A"), makeBook("2", "Book B")]}
      />,
    );
    const items = screen.getAllByTestId("active-book-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Book A")).toBeInTheDocument();
    expect(screen.getByText("Book B")).toBeInTheDocument();
  });

  it("shows the continue reading heading when books are present", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(screen.getByText("Continue reading")).toBeInTheDocument();
  });

  it("does not show the empty state when books are present", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(screen.queryByText("No active books")).not.toBeInTheDocument();
  });

  it("shows a view all books link when books are present", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(
      screen.getByRole("link", { name: /View all books/ }),
    ).toHaveAttribute("href", "/books");
  });
});
