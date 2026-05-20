import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutate = vi.fn();

vi.mock("@/lib/reading-runs", () => ({
  useAddReadingRunMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const { AddHistoricReadingRun } = await import("./add-historic-reading-run");

beforeEach(() => {
  mockMutate.mockClear();
});

function renderComponent(bookId = "book-1", totalPages = 300) {
  return render(
    <AddHistoricReadingRun bookId={bookId} totalPages={totalPages} />,
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /mark completed/i }));
}

function fillDates(
  startedAt = "2024-01-01T10:00",
  finishedAt = "2024-01-15T20:00",
) {
  fireEvent.change(screen.getByLabelText("Started at"), {
    target: { value: startedAt },
  });
  fireEvent.change(screen.getByLabelText("Finished at"), {
    target: { value: finishedAt },
  });
}

describe("AddHistoricReadingRun", () => {
  it('renders a "Mark completed" button', () => {
    renderComponent();
    expect(
      screen.getByRole("button", { name: /mark completed/i }),
    ).toBeInTheDocument();
  });

  it("opens a dialog with the correct heading when the button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    await openDialog(user);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Add historic reading run" }),
    ).toBeInTheDocument();
  });

  it("dialog contains Started at and Finished at inputs", async () => {
    const user = userEvent.setup();
    renderComponent();
    await openDialog(user);

    expect(screen.getByLabelText("Started at")).toBeInTheDocument();
    expect(screen.getByLabelText("Finished at")).toBeInTheDocument();
  });

  it("calls mutate with bookId, totalPages as completedPages, and ISO dates on submit", async () => {
    const user = userEvent.setup();
    renderComponent("book-1", 300);
    await openDialog(user);
    fillDates();

    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "book-1",
        completedPages: 300,
        startedAt: expect.any(String),
        finishedAt: expect.any(String),
      }),
      expect.any(Object),
    );
  });

  it("closes the dialog on success", async () => {
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess?.());

    const user = userEvent.setup();
    renderComponent();
    await openDialog(user);
    fillDates();
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error message when the mutation fails", async () => {
    mockMutate.mockImplementation((_, { onError }) =>
      onError?.(new Error("err", { cause: { message: "server error" } })),
    );

    const user = userEvent.setup();
    renderComponent();
    await openDialog(user);
    fillDates();
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(screen.getByText("server error")).toBeInTheDocument();
  });
});
