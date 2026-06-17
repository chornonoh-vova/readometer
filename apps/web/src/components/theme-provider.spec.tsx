import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useThemeStore } from "@/store/theme";
import { ThemeProvider } from "./theme-provider";

const root = document.documentElement;

function makeMediaQueryList(
  matches: boolean,
  overrides: Partial<{
    addEventListener: MediaQueryList["addEventListener"];
    removeEventListener: MediaQueryList["removeEventListener"];
  }> = {},
) {
  return {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ...overrides,
  } as unknown as MediaQueryList;
}

beforeEach(() => {
  useThemeStore.setState({ theme: "system" });
  root.classList.remove("light", "dark");
});

afterEach(() => {
  root.classList.remove("light", "dark");
});

describe("manual themes", () => {
  it("adds dark class to the document root", () => {
    useThemeStore.setState({ theme: "dark" });
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(root).toHaveClass("dark");
    expect(root).not.toHaveClass("light");
  });

  it("adds light class to the document root", () => {
    useThemeStore.setState({ theme: "light" });
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(root).toHaveClass("light");
    expect(root).not.toHaveClass("dark");
  });
});

describe("system theme", () => {
  it("applies dark when the OS prefers dark", () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce(makeMediaQueryList(true));
    useThemeStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(root).toHaveClass("dark");
  });

  it("applies light when the OS prefers light", () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce(makeMediaQueryList(false));
    useThemeStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(root).toHaveClass("light");
  });

  it("switches theme when the OS preference changes", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;
    vi.mocked(window.matchMedia).mockReturnValueOnce(
      makeMediaQueryList(false, {
        addEventListener: vi
          .fn()
          .mockImplementation(
            (event: string, handler: (e: MediaQueryListEvent) => void) => {
              if (event === "change") changeHandler = handler;
            },
          ),
      }),
    );

    useThemeStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(root).toHaveClass("light");

    changeHandler?.({ matches: true } as MediaQueryListEvent);
    expect(root).toHaveClass("dark");
    expect(root).not.toHaveClass("light");
  });

  it("removes the media query listener on unmount", () => {
    const removeEventListener = vi.fn();
    vi.mocked(window.matchMedia).mockReturnValueOnce(
      makeMediaQueryList(false, { removeEventListener }),
    );

    useThemeStore.setState({ theme: "system" });
    const { unmount } = render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});

describe("children", () => {
  it("renders its children", () => {
    useThemeStore.setState({ theme: "light" });
    const { getByText } = render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>,
    );
    expect(getByText("content")).toBeInTheDocument();
  });
});
