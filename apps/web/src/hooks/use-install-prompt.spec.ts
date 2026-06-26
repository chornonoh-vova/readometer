import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useInstallPrompt } from "./use-install-prompt";
import { useInstallPromptStore } from "@/store/install-prompt";

function makePromptEvent() {
  const event = Object.assign(new Event("beforeinstallprompt"), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  return event;
}

describe("useInstallPrompt", () => {
  beforeEach(() => {
    useInstallPromptStore.setState({ dismissed: false });
  });

  it("canInstall is false before beforeinstallprompt fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it("canInstall becomes true when beforeinstallprompt fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(result.current.canInstall).toBe(true);
  });

  it("canInstall stays false when dismissed is true in the store", () => {
    useInstallPromptStore.setState({ dismissed: true });
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(result.current.canInstall).toBe(false);
  });

  it("install() calls prompt() on the deferred event", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = makePromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    await act(async () => {
      await result.current.install();
    });
    expect(event.prompt).toHaveBeenCalledOnce();
  });

  it("install() clears canInstall after calling prompt()", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    await act(async () => {
      await result.current.install();
    });
    expect(result.current.canInstall).toBe(false);
  });

  it("install() is a no-op when no prompt event has fired", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await act(async () => {
      await result.current.install();
    });
    expect(result.current.canInstall).toBe(false);
  });

  it("dismiss() sets canInstall to false", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(result.current.canInstall).toBe(true);
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.canInstall).toBe(false);
  });

  it("canInstall becomes false when appinstalled fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(result.current.canInstall).toBe(true);
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.canInstall).toBe(false);
  });

  it("removes event listeners on unmount", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useInstallPrompt());
    unmount();
    expect(spy).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("appinstalled", expect.any(Function));
    spy.mockRestore();
  });
});
