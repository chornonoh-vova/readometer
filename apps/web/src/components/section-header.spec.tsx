import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "./section-header";

describe("SectionHeader", () => {
  it("renders the title as a level 2 heading", () => {
    render(<SectionHeader title="Also reading" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Also reading" }),
    ).toBeInTheDocument();
  });

  it("renders the trailing action", () => {
    render(
      <SectionHeader title="Also reading">
        <a href="/books">View all books</a>
      </SectionHeader>,
    );
    expect(
      screen.getByRole("link", { name: "View all books" }),
    ).toHaveAttribute("href", "/books");
  });

  it("renders no heading at all when there is no title", () => {
    render(
      <SectionHeader>
        <a href="/books">View all books</a>
      </SectionHeader>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all books" }),
    ).toBeInTheDocument();
  });
});
