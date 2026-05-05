import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Book } from "@/lib/books";

const mockMutate = vi.fn();

vi.mock("@/lib/books", () => ({
  useEditBookMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("@/lib/format", () => ({
  buildPartialDate: () => undefined,
  splitPartialDate: () => ({ year: "", month: "", day: "" }),
}));

const { EditBookForm } = await import("./edit-book-form");

const baseBook: Book = {
  id: "book-1",
  userId: "user-1",
  title: "Original Title",
  totalPages: 250,
  author: "Jane Doe",
  language: undefined,
  publishDate: undefined,
  isbn13: undefined,
  description: undefined,
  coverId: undefined,
  coverColor: undefined,
  updatedAt: "2025-01-01T00:00:00Z",
  createdAt: "2025-01-01T00:00:00Z",
  completedPages: 0,
  lastUpdatedAt: "2025-01-01T00:00:00Z",
};

beforeEach(() => {
  mockMutate.mockClear();
});

function renderForm(book = baseBook, onClose = vi.fn()) {
  return render(
    <>
      <EditBookForm book={book} onClose={onClose} />
      <button type="submit" form="edit-book-form">
        Submit
      </button>
    </>,
  );
}

describe("EditBookForm", () => {
  it("pre-populates the title field with the book title", () => {
    renderForm();
    const input = screen.getByRole("textbox", { name: "Book title" }) as HTMLInputElement;
    expect(input.value).toBe("Original Title");
  });

  it("pre-populates the totalPages field", () => {
    renderForm();
    const input = screen.getByRole("spinbutton", { name: "Total pages" }) as HTMLInputElement;
    expect(input.value).toBe("250");
  });

  it("pre-populates the author field", () => {
    renderForm();
    const input = screen.getByRole("textbox", { name: "Book author" }) as HTMLInputElement;
    expect(input.value).toBe("Jane Doe");
  });

  it("calls mutate with bookId and updated title on submit", async () => {
    const user = userEvent.setup();
    renderForm();

    const titleInput = screen.getByRole("textbox", { name: "Book title" });
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "book-1",
        updatedBook: expect.objectContaining({ title: "New Title" }),
      }),
      expect.any(Object),
    );
  });

  it("calls onClose after successful mutation", async () => {
    const mockOnClose = vi.fn();
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess?.());

    const user = userEvent.setup();
    renderForm(baseBook, mockOnClose);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("shows 'Failed to update' error message (not 'create') on server error", async () => {
    mockMutate.mockImplementation((_, { onError }) =>
      onError?.({ message: "err", cause: { message: "conflict" } }),
    );

    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText(/Failed to update your book: conflict/)).toBeInTheDocument();
    expect(screen.queryByText(/Failed to create/)).not.toBeInTheDocument();
  });
});
