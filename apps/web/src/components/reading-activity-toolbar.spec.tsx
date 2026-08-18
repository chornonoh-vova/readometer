import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReadingActivityStore } from "@/store/reading-activity";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

const { ReadingActivityToolbar } = await import("./reading-activity-toolbar");

beforeEach(() => {
  navigate.mockClear();
  useReadingActivityStore.setState({
    displayBy: "time",
    weekStart: "monday",
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2030-04-30T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function yearPicker() {
  return screen.getByRole("combobox", { name: "Time period" });
}

async function openYearPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(yearPicker());
  return await screen.findAllByRole("option");
}

describe("ReadingActivityToolbar", () => {
  it("shows Recent when no year is selected", () => {
    render(<ReadingActivityToolbar year={undefined} />);
    expect(yearPicker()).toHaveTextContent("Recent");
  });

  it("shows the selected year", () => {
    render(<ReadingActivityToolbar year={2028} />);
    expect(yearPicker()).toHaveTextContent("2028");
  });

  it("offers Recent first, then the years newest first", async () => {
    const user = userEvent.setup();
    render(<ReadingActivityToolbar year={undefined} />);
    const options = await openYearPicker(user);
    expect(options.map((o) => o.textContent)).toEqual([
      "Recent",
      "2030",
      "2029",
      "2028",
      "2027",
      "2026",
    ]);
  });

  it("navigates with the picked year", async () => {
    const user = userEvent.setup();
    render(<ReadingActivityToolbar year={undefined} />);
    await openYearPicker(user);
    await user.click(screen.getByRole("option", { name: "2028" }));

    expect(navigate).toHaveBeenCalledWith({
      to: "/activity",
      search: { year: 2028 },
      replace: true,
    });
  });

  it("drops the year search param when Recent is picked", async () => {
    const user = userEvent.setup();
    render(<ReadingActivityToolbar year={2028} />);
    await openYearPicker(user);
    await user.click(screen.getByRole("option", { name: "Recent" }));

    expect(navigate).toHaveBeenCalledWith({
      to: "/activity",
      search: {},
      replace: true,
    });
  });

  it("updates the store when displayBy changes externally", () => {
    render(<ReadingActivityToolbar year={undefined} />);
    act(() => {
      useReadingActivityStore.getState().setDisplayBy("pages");
    });
    expect(useReadingActivityStore.getState().displayBy).toBe("pages");
  });
});
