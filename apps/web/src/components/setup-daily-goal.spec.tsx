import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/goals", () => ({
  useUpsertGoalMutation: () => ({ mutate: mockUpsert, isPending: false }),
  useDeleteGoalMutation: () => ({ mutate: mockDelete, isPending: false }),
}));

const { SetupDailyGoal } = await import("./setup-daily-goal");

beforeEach(() => {
  mockUpsert.mockClear();
  mockDelete.mockClear();
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Set up daily reading goal" }),
  );
  return screen.getByRole("dialog");
}

describe("SetupDailyGoal", () => {
  it("renders a settings trigger with an accessible label", () => {
    render(<SetupDailyGoal />);
    expect(
      screen.getByRole("button", { name: "Set up daily reading goal" }),
    ).toBeInTheDocument();
  });

  it("opens the dialog with title 'Set your daily reading goal'", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal />);

    const dialog = await openDialog(user);
    expect(
      within(dialog).getByRole("heading", {
        name: "Set your daily reading goal",
      }),
    ).toBeInTheDocument();
  });

  it("pre-fills the target and metric from current goal", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal id="g1" current={45} metric="pages" />);

    const dialog = await openDialog(user);
    const target = within(dialog).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    expect(target.value).toBe("45");

    const metric = within(dialog).getByRole("combobox", {
      name: "Measure in",
    }) as HTMLSelectElement;
    expect(metric.value).toBe("pages");
  });

  it("defaults to target 0 and metric 'minutes' when no current goal", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal />);

    const dialog = await openDialog(user);
    const target = within(dialog).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    expect(target.value).toBe("0");

    const metric = within(dialog).getByRole("combobox", {
      name: "Measure in",
    }) as HTMLSelectElement;
    expect(metric.value).toBe("minutes");
  });

  it("submits an upsert with type='daily' and the chosen metric/target", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal />);
    const dialog = await openDialog(user);

    const target = within(dialog).getByRole("spinbutton", { name: "Target" });
    await user.clear(target);
    await user.type(target, "30");

    const metric = within(dialog).getByRole("combobox", {
      name: "Measure in",
    });
    await user.selectOptions(metric, "pages");

    await user.click(within(dialog).getByRole("button", { name: "Save goal" }));

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "daily",
        metric: "pages",
        target: 30,
      }),
      expect.any(Object),
    );
    expect(mockUpsert.mock.calls[0]![0].id).toBeTypeOf("string");
  });

  it("resets target and metric to updated props when dialog is reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SetupDailyGoal id="g1" current={45} metric="pages" />,
    );

    const dialog1 = await openDialog(user);
    const target1 = within(dialog1).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    const metric1 = within(dialog1).getByRole("combobox", {
      name: "Measure in",
    }) as HTMLSelectElement;
    expect(target1.value).toBe("45");
    expect(metric1.value).toBe("pages");
    await user.click(within(dialog1).getByRole("button", { name: /cancel/i }));

    rerender(<SetupDailyGoal id="g1" current={60} metric="minutes" />);

    const dialog2 = await openDialog(user);
    const target2 = within(dialog2).getByRole("spinbutton", {
      name: "Target",
    }) as HTMLInputElement;
    const metric2 = within(dialog2).getByRole("combobox", {
      name: "Measure in",
    }) as HTMLSelectElement;
    expect(target2.value).toBe("60");
    expect(metric2.value).toBe("minutes");
  });

  it("does not submit when target is 0 (zod refinement)", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Save goal" }));

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("hides the Delete button when no existing goal id", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal />);
    const dialog = await openDialog(user);

    expect(
      within(dialog).queryByRole("button", { name: "Remove goal" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Delete button and calls deleteGoal with the goal id when clicked", async () => {
    const user = userEvent.setup();
    render(<SetupDailyGoal id="g1" current={30} metric="minutes" />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Remove goal" }),
    );

    expect(mockDelete).toHaveBeenCalledWith("g1", expect.any(Object));
  });

  it("shows the server error message on upsert failure", async () => {
    mockUpsert.mockImplementation((_, { onError }) =>
      onError?.(new Error("err", { cause: { message: "validation failed" } })),
    );

    const user = userEvent.setup();
    render(<SetupDailyGoal />);
    const dialog = await openDialog(user);

    const target = within(dialog).getByRole("spinbutton", { name: "Target" });
    await user.clear(target);
    await user.type(target, "20");

    await user.click(within(dialog).getByRole("button", { name: "Save goal" }));

    expect(screen.getByText(/validation failed/)).toBeInTheDocument();
  });

  it("shows the server error message on delete failure", async () => {
    mockDelete.mockImplementation((_, { onError }) =>
      onError?.(new Error("err", { cause: { message: "not found" } })),
    );

    const user = userEvent.setup();
    render(<SetupDailyGoal id="g1" current={30} metric="minutes" />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Remove goal" }),
    );

    expect(screen.getByText(/not found/)).toBeInTheDocument();
  });
});
