import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/goals", () => ({
  useUpsertGoalMutation: () => ({ mutate: mockUpsert, isPending: false }),
  useDeleteGoalMutation: () => ({ mutate: mockDelete, isPending: false }),
}));

const { SetupYearlyGoal } = await import("./setup-yearly-goal");

beforeEach(() => {
  mockUpsert.mockClear();
  mockDelete.mockClear();
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Setup yearly reading goal" }),
  );
  return screen.getByRole("dialog");
}

describe("SetupYearlyGoal", () => {
  it("renders a settings trigger with an accessible label", () => {
    render(<SetupYearlyGoal />);
    expect(
      screen.getByRole("button", { name: "Setup yearly reading goal" }),
    ).toBeInTheDocument();
  });

  it("opens the dialog with title 'Setup the yearly reading goal'", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal />);

    const dialog = await openDialog(user);
    expect(
      within(dialog).getByRole("heading", {
        name: "Setup the yearly reading goal",
      }),
    ).toBeInTheDocument();
  });

  it("pre-fills the target from current", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal id="g2" current={12} />);

    const dialog = await openDialog(user);
    const target = within(dialog).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    expect(target.value).toBe("12");
  });

  it("defaults target to 0 when no current goal", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal />);

    const dialog = await openDialog(user);
    const target = within(dialog).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    expect(target.value).toBe("0");
  });

  it("submits an upsert with type='yearly' and metric='books'", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal />);
    const dialog = await openDialog(user);

    const target = within(dialog).getByRole("spinbutton", { name: "Target" });
    await user.clear(target);
    await user.type(target, "20");

    await user.click(
      within(dialog).getByRole("button", { name: "Setup goal" }),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "yearly",
        metric: "books",
        target: 20,
      }),
      expect.any(Object),
    );
    expect(mockUpsert.mock.calls[0]![0].id).toBeTypeOf("string");
  });

  it("resets target to updated current when dialog is reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SetupYearlyGoal id="g2" current={12} />);

    const dialog1 = await openDialog(user);
    const target1 = within(dialog1).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    expect(target1.value).toBe("12");
    await user.click(within(dialog1).getByRole("button", { name: /cancel/i }));

    rerender(<SetupYearlyGoal id="g2" current={20} />);

    const dialog2 = await openDialog(user);
    const target2 = within(dialog2).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    expect(target2.value).toBe("20");
  });

  it("does not submit when target is 0", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Setup goal" }),
    );

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("hides the Delete button when no existing goal id", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal />);
    const dialog = await openDialog(user);

    expect(
      within(dialog).queryByRole("button", { name: "Delete goal" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Delete button and calls deleteGoal with the goal id when clicked", async () => {
    const user = userEvent.setup();
    render(<SetupYearlyGoal id="g2" current={12} />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Delete goal" }),
    );

    expect(mockDelete).toHaveBeenCalledWith("g2", expect.any(Object));
  });

  it("shows the server error message on upsert failure", async () => {
    mockUpsert.mockImplementation((_, { onError }) =>
      onError?.(new Error("err", { cause: { message: "target must be > 0" } })),
    );

    const user = userEvent.setup();
    render(<SetupYearlyGoal />);
    const dialog = await openDialog(user);

    const target = within(dialog).getByRole("spinbutton", { name: "Target" });
    await user.clear(target);
    await user.type(target, "5");

    await user.click(
      within(dialog).getByRole("button", { name: "Setup goal" }),
    );

    expect(screen.getByText(/target must be > 0/)).toBeInTheDocument();
  });
});
