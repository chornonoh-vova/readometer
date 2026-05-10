import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("No books yet")).toBeInTheDocument();
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
    expect(screen.queryByText("No books yet")).not.toBeInTheDocument();
  });
});
