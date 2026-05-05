import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-04-30T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReadingActivityToolbar", () => {
  it("offers years from minYear up through current year", () => {
    render(<ReadingActivityToolbar year={2026} />);
    const select = screen.getByRole("combobox", { name: "Year" }) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["2026", "2027", "2028", "2029", "2030"]);
  });

  it("navigates with the picked year", () => {
    render(<ReadingActivityToolbar year={2026} />);
    const select = screen.getByRole("combobox", { name: "Year" });
    fireEvent.change(select, { target: { value: "2028" } });

    expect(navigate).toHaveBeenCalledWith({
      to: "/activity",
      search: { year: 2028 },
    });
  });

  it("reflects the controlled year prop on the select", () => {
    render(<ReadingActivityToolbar year={2028} />);
    const select = screen.getByRole("combobox", { name: "Year" }) as HTMLSelectElement;
    expect(select.value).toBe("2028");
  });

  it("updates the store when displayBy changes externally", () => {
    render(<ReadingActivityToolbar year={2026} />);
    act(() => {
      useReadingActivityStore.getState().setDisplayBy("pages");
    });
    expect(useReadingActivityStore.getState().displayBy).toBe("pages");
  });
});
