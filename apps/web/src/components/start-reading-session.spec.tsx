import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReadingSessionStore } from "@/store/reading-session";
import type { BookDetails } from "@/lib/books";
import type { ReadingRun } from "@/lib/reading-runs";

const mockMutateAsync = vi.fn();
const mockStart = vi.fn();

vi.mock("@/lib/reading-runs", () => ({
  useAddReadingRunMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const { StartReadingSession } = await import("./start-reading-session");

const book: BookDetails = {
  id: "book-1",
  userId: "user-1",
  title: "Dune",
  totalPages: 300,
  author: "Frank Herbert",
  description: undefined,
  publishDate: undefined,
  isbn13: undefined,
  coverId: undefined,
  coverColor: undefined,
  language: undefined,
  updatedAt: "2025-01-01T00:00:00Z",
  createdAt: "2025-01-01T00:00:00Z",
};

const inProgressRun: ReadingRun = {
  id: "run-1",
  userId: "user-1",
  bookId: "book-1",
  completedPages: 50,
  startedAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  finishedAt: null,
  status: null,
};

const completedRun: ReadingRun = {
  ...inProgressRun,
  completedPages: 300,
  finishedAt: "2025-01-02T00:00:00Z",
};

beforeEach(() => {
  mockMutateAsync.mockClear();
  mockStart.mockClear();
  useReadingSessionStore.setState({ session: null, start: mockStart });
});

describe("StartReadingSession", () => {
  it("shows Start button when there is no reading run", () => {
    render(<StartReadingSession book={book} />);
    expect(
      screen.getByRole("button", { name: /^start$/i }),
    ).toBeInTheDocument();
  });

  it("shows Continue button when an in-progress run exists", () => {
    render(<StartReadingSession book={book} readingRun={inProgressRun} />);
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
  });

  it("shows Restart button when the book is completed", () => {
    render(<StartReadingSession book={book} readingRun={completedRun} />);
    expect(
      screen.getByRole("button", { name: /restart/i }),
    ).toBeInTheDocument();
  });

  it("disables the button when a session is already active", () => {
    useReadingSessionStore.setState({
      session: {
        book,
        runId: "run-1",
        paused: false,
        startedAt: new Date().toISOString(),
        startPage: 50,
        readTime: 0,
        lastPausedAt: null,
        lastContinuedAt: null,
      },
    });
    render(<StartReadingSession book={book} readingRun={inProgressRun} />);
    expect(
      screen.getByRole("button", { name: /reading\.\.\./i }),
    ).toBeDisabled();
  });

  it("opens the dialog when the Start button is clicked", async () => {
    const user = userEvent.setup();
    render(<StartReadingSession book={book} />);

    await user.click(screen.getByRole("button", { name: /^start$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Start a session" }),
    ).toBeInTheDocument();
  });

  it("defaults start page to 0 when there is no run", async () => {
    const user = userEvent.setup();
    render(<StartReadingSession book={book} />);

    await user.click(screen.getByRole("button", { name: /^start$/i }));

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("spinbutton", {
      name: "Start page",
    }) as HTMLInputElement;
    expect(input.value).toBe("0");
    expect(input).toHaveAttribute("min", "0");
  });

  it("defaults start page to completedPages when continuing a run", async () => {
    const user = userEvent.setup();
    render(<StartReadingSession book={book} readingRun={inProgressRun} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("spinbutton", {
      name: "Start page",
    }) as HTMLInputElement;
    expect(input.value).toBe("50");
    expect(input).toHaveAttribute("min", "50");
  });

  it("allows start page 0 when restarting a completed book (bug fix)", async () => {
    const user = userEvent.setup();
    render(<StartReadingSession book={book} readingRun={completedRun} />);

    await user.click(screen.getByRole("button", { name: /restart/i }));

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("spinbutton", {
      name: "Start page",
    }) as HTMLInputElement;
    expect(input.value).toBe("0");
    expect(input).toHaveAttribute("min", "0");
  });

  it("creates a new run and calls start on submit", async () => {
    mockMutateAsync.mockResolvedValue({ id: "new-run-1", completedPages: 0 });

    const user = userEvent.setup();
    render(<StartReadingSession book={book} />);

    await user.click(screen.getByRole("button", { name: /^start$/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^start$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ bookId: "book-1", completedPages: 0 }),
    );
    expect(mockStart).toHaveBeenCalledWith(
      book,
      "new-run-1",
      expect.any(String),
      0,
    );
  });

  it("resets start page to updated completedPages when dialog is reopened", async () => {
    const user = userEvent.setup();
    const updatedRun = { ...inProgressRun, completedPages: 100 };
    const { rerender } = render(
      <StartReadingSession book={book} readingRun={inProgressRun} />,
    );

    await user.click(screen.getByRole("button", { name: /continue/i }));
    const dialog1 = screen.getByRole("dialog");
    const input1 = within(dialog1).getByRole("spinbutton", {
      name: "Start page",
    }) as HTMLInputElement;
    expect(input1.value).toBe("50");
    await user.click(within(dialog1).getByRole("button", { name: /cancel/i }));

    rerender(<StartReadingSession book={book} readingRun={updatedRun} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));
    const dialog2 = screen.getByRole("dialog");
    const input2 = within(dialog2).getByRole("spinbutton", {
      name: "Start page",
    }) as HTMLInputElement;
    expect(input2.value).toBe("100");
    expect(input2).toHaveAttribute("min", "100");
  });

  it("uses the existing run without creating a new one when continuing", async () => {
    mockStart.mockImplementation(() => {});

    const user = userEvent.setup();
    render(<StartReadingSession book={book} readingRun={inProgressRun} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^start$/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(
      book,
      "run-1",
      expect.any(String),
      50,
    );
  });
});
