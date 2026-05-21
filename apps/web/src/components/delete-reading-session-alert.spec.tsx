import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutate = vi.fn();

vi.mock("@/lib/reading-sessions", () => ({
  useDeleteReadingSessionMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const { DeleteReadingSessionAlert } =
  await import("./delete-reading-session-alert");

describe("DeleteReadingSessionAlert", () => {
  it("renders the confirmation heading when open", () => {
    render(
      <DeleteReadingSessionAlert
        sessionId="s1"
        runId="r1"
        bookId="b1"
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Delete this reading session?" }),
    ).toBeInTheDocument();
  });

  it("renders the permanent deletion warning", () => {
    render(
      <DeleteReadingSessionAlert
        sessionId="s1"
        runId="r1"
        bookId="b1"
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it("calls mutate when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DeleteReadingSessionAlert
        sessionId="s1"
        runId="r1"
        bookId="b1"
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete session/i }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("does not render content when closed", () => {
    render(
      <DeleteReadingSessionAlert
        sessionId="s1"
        runId="r1"
        bookId="b1"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Delete this reading session?" }),
    ).not.toBeInTheDocument();
  });
});
