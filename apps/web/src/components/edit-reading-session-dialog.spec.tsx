import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReadingSession } from "@/lib/reading-sessions";

const mockMutate = vi.fn();

vi.mock("@/lib/reading-sessions", () => ({
  useEditReadingSessionMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const { EditReadingSessionDialog } = await import("./edit-reading-session-dialog");

const session: ReadingSession = {
  id: "session-1",
  userId: "user-1",
  runId: "run-1",
  startPage: 20,
  endPage: 60,
  readPages: 40,
  startTime: "2025-01-01T10:00:00Z",
  endTime: "2025-01-01T11:00:00Z",
  readTime: 3600,
};

beforeEach(() => {
  mockMutate.mockClear();
});

function renderDialog(
  overrides: {
    latest?: boolean;
    totalPages?: number;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  } = {},
) {
  const {
    latest = true,
    totalPages = 300,
    open = true,
    onOpenChange = vi.fn(),
  } = overrides;
  return render(
    <EditReadingSessionDialog
      latest={latest}
      session={session}
      runId="run-1"
      bookId="book-1"
      totalPages={totalPages}
      open={open}
      onOpenChange={onOpenChange}
    />,
  );
}

describe("EditReadingSessionDialog", () => {
  it("pre-populates startPage and endPage from the session", () => {
    renderDialog();
    const startPageInput = screen.getByRole("spinbutton", { name: "Start page" }) as HTMLInputElement;
    const endPageInput = screen.getByRole("spinbutton", { name: "End page" }) as HTMLInputElement;
    expect(startPageInput.value).toBe("20");
    expect(endPageInput.value).toBe("60");
  });

  it("calls mutate with updated endPage and updateRun=true when latest", async () => {
    const user = userEvent.setup();
    renderDialog();

    const endPageInput = screen.getByRole("spinbutton", { name: "End page" });
    await user.clear(endPageInput);
    await user.type(endPageInput, "80");
    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ endPage: 80, updateRun: true }),
      expect.any(Object),
    );
  });

  it("calls mutate with updateRun=false when not latest", async () => {
    const user = userEvent.setup();
    renderDialog({ latest: false });

    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ updateRun: false }),
      expect.any(Object),
    );
  });

  it("closes on successful update", async () => {
    const mockOnOpenChange = vi.fn();
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess?.());

    const user = userEvent.setup();
    renderDialog({ onOpenChange: mockOnOpenChange });

    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows server error message on mutation failure", async () => {
    mockMutate.mockImplementation((_, { onError }) =>
      onError?.({ message: "err", cause: { message: "Bad request" } }),
    );

    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(screen.getByText(/Failed to edit a reading session: Bad request/)).toBeInTheDocument();
  });

  it("does not call mutate when endPage exceeds totalPages", async () => {
    const user = userEvent.setup();
    renderDialog({ totalPages: 100 });

    const endPageInput = screen.getByRole("spinbutton", { name: "End page" });
    await user.clear(endPageInput);
    await user.type(endPageInput, "150");
    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("spinbutton", { name: "Start page" })).not.toBeInTheDocument();
  });
});
