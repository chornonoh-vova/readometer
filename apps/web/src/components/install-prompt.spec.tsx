import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallPrompt } from "./install-prompt";
import * as useInstallPromptModule from "@/hooks/use-install-prompt";

const mockHook = (
  overrides: Partial<
    ReturnType<typeof useInstallPromptModule.useInstallPrompt>
  >,
) => {
  vi.spyOn(useInstallPromptModule, "useInstallPrompt").mockReturnValue({
    canInstall: false,
    install: vi.fn(),
    dismiss: vi.fn(),
    ...overrides,
  });
};

describe("InstallPrompt", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockHook({});
  });

  it("renders nothing when canInstall is false", () => {
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the install banner when canInstall is true", () => {
    mockHook({ canInstall: true });
    render(<InstallPrompt />);
    expect(
      screen.getByText("Install Readometer for quick access"),
    ).toBeInTheDocument();
  });

  it("shows Install and Dismiss buttons when visible", () => {
    mockHook({ canInstall: true });
    render(<InstallPrompt />);
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls install() when the Install button is clicked", async () => {
    const install = vi.fn();
    mockHook({ canInstall: true, install });
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(install).toHaveBeenCalledOnce();
  });

  it("calls dismiss() when the Dismiss button is clicked", async () => {
    const dismiss = vi.fn();
    mockHook({ canInstall: true, dismiss });
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
