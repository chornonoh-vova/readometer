import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReadingSessionStore } from "@/store/reading-session";
import type { BookDetails } from "@/lib/books";

const mockMutate = vi.fn();
const mockFinish = vi.fn();

vi.mock("@/lib/reading-sessions", () => ({
  useAddReadingSessionMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const { FinishReadingSession } = await import("./finish-reading-session");

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

const pausedSession = {
  book,
  runId: "run-1",
  paused: true,
  startedAt: "2025-01-01T10:00:00.000Z",
  startPage: 40,
  readTime: 1800,
  lastPausedAt: "2025-01-01T10:30:00.000Z",
  lastContinuedAt: null,
};

beforeEach(() => {
  mockMutate.mockClear();
  mockFinish.mockClear();
  useReadingSessionStore.setState({ session: pausedSession, finish: mockFinish });
});

async function openDialogAndSetEndPage(
  user: ReturnType<typeof userEvent.setup>,
  endPage: string,
) {
  render(<FinishReadingSession />);
  await user.click(screen.getByRole("button", { name: /^finish$/i }));
  const dialog = screen.getByRole("dialog");
  const endPageInput = within(dialog).getByRole("spinbutton", { name: "End page" });
  await user.clear(endPageInput);
  await user.type(endPageInput, endPage);
  return { dialog };
}

describe("FinishReadingSession", () => {
  it("renders the Finish trigger button", () => {
    render(<FinishReadingSession />);
    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
  });

  it("opens the dialog when the Finish button is clicked", async () => {
    const user = userEvent.setup();
    render(<FinishReadingSession />);

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finish reading session" })).toBeInTheDocument();
  });

  it("shows an End page label in the dialog", async () => {
    const user = userEvent.setup();
    render(<FinishReadingSession />);

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(screen.getByRole("spinbutton", { name: "End page" })).toBeInTheDocument();
  });

  it("defaults end page to the session startPage", async () => {
    const user = userEvent.setup();
    render(<FinishReadingSession />);

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    const input = screen.getByRole("spinbutton", { name: "End page" }) as HTMLInputElement;
    expect(input.value).toBe("40");
  });

  it("calls mutate with session data on submit", async () => {
    mockMutate.mockImplementation(() => {});
    const user = userEvent.setup();
    const { dialog } = await openDialogAndSetEndPage(user, "80");

    await user.click(within(dialog).getByRole("button", { name: /^finish$/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        startPage: 40,
        endPage: 80,
        startTime: "2025-01-01T10:00:00.000Z",
        endTime: "2025-01-01T10:30:00.000Z",
        readTime: 1800,
      }),
      expect.any(Object),
    );
  });

  it("calls finish from the store on successful submission", async () => {
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess?.());
    const user = userEvent.setup();
    const { dialog } = await openDialogAndSetEndPage(user, "80");

    await user.click(within(dialog).getByRole("button", { name: /^finish$/i }));

    expect(mockFinish).toHaveBeenCalledOnce();
  });

  it("shows server error message on mutation failure", async () => {
    mockMutate.mockImplementation((_, { onError }) =>
      onError?.({ message: "err", cause: { message: "Page out of range" } }),
    );
    const user = userEvent.setup();
    const { dialog } = await openDialogAndSetEndPage(user, "80");

    await user.click(within(dialog).getByRole("button", { name: /^finish$/i }));

    expect(screen.getByText(/Page out of range/)).toBeInTheDocument();
  });
});
