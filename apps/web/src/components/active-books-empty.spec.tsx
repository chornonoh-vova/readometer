import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const { ActiveBooksEmpty } = await import("./active-books-empty");

describe("ActiveBooksEmpty", () => {
  it("renders the no active books title", () => {
    render(<ActiveBooksEmpty />);
    expect(screen.getByText("Nothing in progress")).toBeInTheDocument();
  });

  it("renders the descriptive message", () => {
    render(<ActiveBooksEmpty />);
    expect(
      screen.getByText(/Pick up a book from your library/),
    ).toBeInTheDocument();
  });

  it("renders a link to the books page", () => {
    render(<ActiveBooksEmpty />);
    expect(
      screen.getByRole("link", { name: /Go to your library/ }),
    ).toHaveAttribute("href", "/books");
  });
});
