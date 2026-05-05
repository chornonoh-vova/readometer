import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutate = vi.fn();

vi.mock("@/lib/cover", () => ({
  useDeleteBookCoverMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const { DeleteBookCoverAlert } = await import("./delete-book-cover-alert");

describe("DeleteBookCoverAlert", () => {
  it("renders the confirmation heading when open", () => {
    render(
      <DeleteBookCoverAlert bookId="b1" open={true} onOpenChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("heading", { name: "Delete book cover for this book?" }),
    ).toBeInTheDocument();
  });

  it("renders the permanent deletion warning", () => {
    render(
      <DeleteBookCoverAlert bookId="b1" open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it("calls mutate when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DeleteBookCoverAlert bookId="b1" open={true} onOpenChange={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("does not render content when closed", () => {
    render(
      <DeleteBookCoverAlert bookId="b1" open={false} onOpenChange={vi.fn()} />,
    );
    expect(
      screen.queryByRole("heading", { name: "Delete book cover for this book?" }),
    ).not.toBeInTheDocument();
  });
});
