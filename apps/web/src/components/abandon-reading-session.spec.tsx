import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReadingSessionStore } from "@/store/reading-session";
import { AbandonReadingSession } from "./abandon-reading-session";

describe("AbandonReadingSession", () => {
  it("renders the Abandon trigger button", () => {
    render(<AbandonReadingSession />);
    expect(
      screen.getByRole("button", { name: /abandon/i }),
    ).toBeInTheDocument();
  });

  it("opens the confirmation dialog on trigger click", async () => {
    const user = userEvent.setup();
    render(<AbandonReadingSession />);
    await user.click(screen.getByRole("button", { name: /abandon/i }));
    expect(screen.getByText("Abandon current session?")).toBeInTheDocument();
  });

  it("shows the warning description in the dialog", async () => {
    const user = userEvent.setup();
    render(<AbandonReadingSession />);
    await user.click(screen.getByRole("button", { name: /abandon/i }));
    expect(
      screen.getByText(/progress that you've made will not be saved/i),
    ).toBeInTheDocument();
  });

  it("calls cancel from the store when the Abandon action is confirmed", async () => {
    const mockCancel = vi.fn();
    useReadingSessionStore.setState({ cancel: mockCancel });

    const user = userEvent.setup();
    render(<AbandonReadingSession />);
    await user.click(screen.getByRole("button", { name: /abandon/i }));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /abandon/i }));

    expect(mockCancel).toHaveBeenCalledOnce();
  });

  it("closes the dialog on Cancel", async () => {
    const user = userEvent.setup();
    render(<AbandonReadingSession />);
    await user.click(screen.getByRole("button", { name: /abandon/i }));

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
