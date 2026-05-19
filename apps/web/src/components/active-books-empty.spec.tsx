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
    expect(screen.getByText("No active books")).toBeInTheDocument();
  });

  it("renders the descriptive message", () => {
    render(<ActiveBooksEmpty />);
    expect(
      screen.getByText(/You haven't started reading any books yet/),
    ).toBeInTheDocument();
  });

  it("renders a link to the books page", () => {
    render(<ActiveBooksEmpty />);
    expect(
      screen.getByRole("link", { name: /View all books/ }),
    ).toHaveAttribute("href", "/books");
  });
});
