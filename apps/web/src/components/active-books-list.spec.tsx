import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Book } from "@/lib/books";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("./book-item", () => ({
  BookItem: ({ book, variant }: { book: Book; variant?: string }) => (
    <div data-testid="book-item" data-variant={variant ?? "default"}>
      {book.title}
    </div>
  ),
}));

vi.mock("./start-reading-session", () => ({
  StartReadingSession: ({
    readingRun,
  }: {
    readingRun?: { id: string; completedPages: number };
  }) => (
    <button
      type="button"
      data-testid="start-reading-session"
      data-run-id={readingRun?.id ?? ""}
      data-completed-pages={readingRun?.completedPages ?? ""}
    >
      Start
    </button>
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

  it("does not show any section heading when books list is empty", () => {
    render(<ActiveBooksList books={[]} />);
    expect(screen.queryByText("Most recent book")).not.toBeInTheDocument();
    expect(screen.queryByText("Also reading")).not.toBeInTheDocument();
  });

  it("renders an item for each book", () => {
    render(
      <ActiveBooksList
        books={[makeBook("1", "Book A"), makeBook("2", "Book B")]}
      />,
    );
    expect(screen.getAllByTestId("book-item")).toHaveLength(2);
    expect(screen.getByText("Book A")).toBeInTheDocument();
    expect(screen.getByText("Book B")).toBeInTheDocument();
  });

  it("renders the first book as the default variant and the rest as compact", () => {
    render(
      <ActiveBooksList
        books={[
          makeBook("1", "Book A"),
          makeBook("2", "Book B"),
          makeBook("3", "Book C"),
        ]}
      />,
    );
    const variants = screen
      .getAllByTestId("book-item")
      .map((item) => item.getAttribute("data-variant"));
    expect(variants).toEqual(["default", "compact", "compact"]);
  });

  it("shows the most recent book heading when books are present", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(screen.getByText("Most recent book")).toBeInTheDocument();
  });

  it("does not show the empty state when books are present", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(screen.queryByText("No active books")).not.toBeInTheDocument();
  });

  it("only shows the also reading heading when there is more than one book", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(screen.queryByText("Also reading")).not.toBeInTheDocument();
  });

  it("shows the also reading heading when there is more than one book", () => {
    render(
      <ActiveBooksList
        books={[makeBook("1", "Book A"), makeBook("2", "Book B")]}
      />,
    );
    expect(screen.getByText("Also reading")).toBeInTheDocument();
  });

  it("starts a reading session for the most recent book only", () => {
    render(
      <ActiveBooksList
        books={[makeBook("1", "Book A"), makeBook("2", "Book B")]}
      />,
    );
    const triggers = screen.getAllByTestId("start-reading-session");
    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toHaveAttribute("data-run-id", "1-run");
    expect(triggers[0]).toHaveAttribute("data-completed-pages", "50");
  });

  it("shows a view all books link with a single book", () => {
    render(<ActiveBooksList books={[makeBook("1", "Book A")]} />);
    expect(
      screen.getByRole("link", { name: /View all books/ }),
    ).toHaveAttribute("href", "/books");
  });

  it("shows a view all books link with several books", () => {
    render(
      <ActiveBooksList
        books={[makeBook("1", "Book A"), makeBook("2", "Book B")]}
      />,
    );
    expect(
      screen.getByRole("link", { name: /View all books/ }),
    ).toHaveAttribute("href", "/books");
  });
});
