import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookStatus } from "./book-status";

describe("BookStatus", () => {
  it("shows To Read when no pages have been completed", () => {
    render(<BookStatus completedPages={0} totalPages={300} />);
    expect(screen.getByText("To Read")).toBeInTheDocument();
  });

  it("shows In Progress when some but not all pages are completed", () => {
    render(<BookStatus completedPages={120} totalPages={300} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows Completed when all pages are completed", () => {
    render(<BookStatus completedPages={300} totalPages={300} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows To Read for a zero-page book with zero completed", () => {
    render(<BookStatus completedPages={0} totalPages={0} />);
    expect(screen.getByText("To Read")).toBeInTheDocument();
  });

  it("shows Abandoned when abandoned is true and some pages are completed", () => {
    render(<BookStatus completedPages={50} totalPages={300} abandoned={true} />);
    expect(screen.getByText("Abandoned")).toBeInTheDocument();
  });

  it("shows In Progress (not Abandoned) when abandoned is false", () => {
    render(<BookStatus completedPages={50} totalPages={300} abandoned={false} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
