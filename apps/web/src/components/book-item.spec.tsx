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

const { BookItem } = await import("./book-item");

const book: Book = {
  id: "b1",
  userId: "u1",
  title: "The Pragmatic Programmer",
  author: "David Thomas",
  totalPages: 320,
  completedPages: 160,
  updatedAt: "2024-01-01",
  createdAt: "2024-01-01",
  lastUpdatedAt: "2024-01-01",
  lastRunId: "run-1",
};

describe("BookItem", () => {
  it("renders the book title", () => {
    render(<BookItem book={book} />);
    expect(
      screen.getByText("The Pragmatic Programmer", {
        selector: '[data-slot="item-title"]',
      }),
    ).toBeInTheDocument();
  });

  it("renders the author", () => {
    render(<BookItem book={book} />);
    expect(screen.getByText("David Thomas")).toBeInTheDocument();
  });

  it("links to the book detail page", () => {
    render(<BookItem book={book} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/books/b1");
  });

  it("shows the page count progress", () => {
    render(<BookItem book={book} />);
    expect(screen.getByText("160 / 320")).toBeInTheDocument();
  });

  it("shows the reading status", () => {
    render(<BookItem book={book} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
