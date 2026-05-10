import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/books", () => ({
  useAddBookMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const { AddBookForm } = await import("./add-book-form");

beforeEach(() => {
  mockMutate.mockClear();
  mockNavigate.mockClear();
});

function renderForm(onClose = vi.fn()) {
  return render(
    <>
      <AddBookForm onClose={onClose} />
      <button type="submit" form="add-book-form">
        Submit
      </button>
    </>,
  );
}

describe("AddBookForm", () => {
  it("renders Book title and Total pages fields", () => {
    renderForm();
    expect(
      screen.getByRole("textbox", { name: "Book title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Total pages" }),
    ).toBeInTheDocument();
  });

  it("renders optional fields for author, ISBN, and description", () => {
    renderForm();
    expect(
      screen.getByRole("textbox", { name: "Book author" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "ISBN" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Description" }),
    ).toBeInTheDocument();
  });

  it("calls mutate with title and totalPages on valid submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("textbox", { name: "Book title" }),
      "The Great Gatsby",
    );
    const totalPagesInput = screen.getByRole("spinbutton", {
      name: "Total pages",
    });
    await user.clear(totalPagesInput);
    await user.type(totalPagesInput, "180");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "The Great Gatsby", totalPages: 180 }),
      expect.any(Object),
    );
  });

  it("calls onClose after successful mutation", async () => {
    const mockOnClose = vi.fn();
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess?.());

    const user = userEvent.setup();
    renderForm(mockOnClose);

    await user.type(
      screen.getByRole("textbox", { name: "Book title" }),
      "Dune",
    );
    const totalPagesInput = screen.getByRole("spinbutton", {
      name: "Total pages",
    });
    await user.clear(totalPagesInput);
    await user.type(totalPagesInput, "412");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("navigates to the book detail page after successful submit using the same id passed to mutate", async () => {
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess?.());

    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("textbox", { name: "Book title" }),
      "Foundation",
    );
    const totalPagesInput = screen.getByRole("spinbutton", {
      name: "Total pages",
    });
    await user.clear(totalPagesInput);
    await user.type(totalPagesInput, "255");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    const submittedId = mockMutate.mock.calls[0]![0].id as string;
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/books/$bookId",
      params: { bookId: submittedId },
    });
  });

  it("shows server error message when mutation fails", async () => {
    mockMutate.mockImplementation((_, { onError }) =>
      onError?.(
        new Error("Network error", { cause: { message: "Server down" } }),
      ),
    );

    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("textbox", { name: "Book title" }),
      "1984",
    );
    const totalPagesInput = screen.getByRole("spinbutton", {
      name: "Total pages",
    });
    await user.clear(totalPagesInput);
    await user.type(totalPagesInput, "328");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      screen.getByText(/Failed to create a new book: Server down/),
    ).toBeInTheDocument();
  });

  it("does not submit when title is empty", async () => {
    const user = userEvent.setup();
    renderForm();

    const totalPagesInput = screen.getByRole("spinbutton", {
      name: "Total pages",
    });
    await user.clear(totalPagesInput);
    await user.type(totalPagesInput, "100");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not submit when totalPages is zero", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("textbox", { name: "Book title" }),
      "Valid Title",
    );
    const totalPagesInput = screen.getByRole("spinbutton", {
      name: "Total pages",
    });
    await user.clear(totalPagesInput);
    await user.type(totalPagesInput, "0");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
