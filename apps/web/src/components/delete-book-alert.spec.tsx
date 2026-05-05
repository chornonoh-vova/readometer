import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutate = vi.fn();

vi.mock("@/lib/books", () => ({
  useDeleteBookMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const { DeleteBookAlert } = await import("./delete-book-alert");

describe("DeleteBookAlert", () => {
  it("renders the book title in the dialog heading", () => {
    render(
      <DeleteBookAlert
        bookId="book-1"
        title="Dune"
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Delete book "Dune"\?/)).toBeInTheDocument();
  });

  it("renders the permanent deletion warning", () => {
    render(
      <DeleteBookAlert
        bookId="book-1"
        title="Dune"
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it("calls mutate with the book id when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DeleteBookAlert
        bookId="book-42"
        title="Dune"
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockMutate).toHaveBeenCalledWith("book-42", expect.any(Object));
  });

  it("does not render content when closed", () => {
    render(
      <DeleteBookAlert
        bookId="book-1"
        title="Dune"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Delete book/)).not.toBeInTheDocument();
  });
});
