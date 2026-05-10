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

vi.mock("./start-reading-session", () => ({
  StartReadingSession: ({
    readingRun,
    icon,
  }: {
    icon?: boolean;
    readingRun?: { id: string; completedPages: number };
  }) => (
    <button
      type="button"
      data-testid="start-reading-session"
      data-icon={icon ? "true" : "false"}
      data-run-id={readingRun?.id ?? ""}
      data-completed-pages={readingRun?.completedPages ?? ""}
    >
      Start
    </button>
  ),
}));

const { ActiveBookItem } = await import("./active-book-item");

const book: Book = {
  id: "b1",
  userId: "u1",
  title: "The Pragmatic Programmer",
  author: "David Thomas",
  totalPages: 320,
  completedPages: 80,
  updatedAt: "2024-01-01",
  createdAt: "2024-01-01",
  lastUpdatedAt: "2024-01-01",
  lastRunId: "run-1",
};

describe("ActiveBookItem", () => {
  it("renders the book title", () => {
    render(<ActiveBookItem book={book} />);
    expect(
      screen.getByText("The Pragmatic Programmer", {
        selector: '[data-slot="item-title"]',
      }),
    ).toBeInTheDocument();
  });

  it("shows pages progress and percentage", () => {
    render(<ActiveBookItem book={book} />);
    expect(screen.getByText(/80 \/ 320 pages \(25%\)/)).toBeInTheDocument();
  });

  it("renders a link to the book detail page", () => {
    render(<ActiveBookItem book={book} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/books/b1");
  });

  it("renders StartReadingSession in icon mode with the book's last run id and completed pages", () => {
    render(<ActiveBookItem book={book} />);
    const trigger = screen.getByTestId("start-reading-session");
    expect(trigger).toHaveAttribute("data-icon", "true");
    expect(trigger).toHaveAttribute("data-run-id", "run-1");
    expect(trigger).toHaveAttribute("data-completed-pages", "80");
  });

  it("does not render a cover image when the book has no coverId", () => {
    render(<ActiveBookItem book={book} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the cover image when coverId is set", () => {
    render(<ActiveBookItem book={{ ...book, coverId: "cov-1" }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/api/covers/cov-1-sm.webp");
    expect(img).toHaveAttribute(
      "alt",
      "Cover image for book The Pragmatic Programmer",
    );
  });
});
