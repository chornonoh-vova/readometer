import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./theme";

beforeEach(() => {
  useThemeStore.setState({ theme: "system" });
});

describe("initial state", () => {
  it("defaults to system theme", () => {
    expect(useThemeStore.getState().theme).toBe("system");
  });
});

describe("setTheme", () => {
  it("updates to dark", () => {
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("updates to light", () => {
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("updates back to system", () => {
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().setTheme("system");
    expect(useThemeStore.getState().theme).toBe("system");
  });
});

describe("persistence", () => {
  it("saves the selected theme to localStorage", () => {
    useThemeStore.getState().setTheme("dark");
    const stored = JSON.parse(localStorage.getItem("theme") ?? "{}");
    expect(stored.state.theme).toBe("dark");
  });
});
