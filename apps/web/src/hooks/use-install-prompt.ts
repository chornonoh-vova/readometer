import { useCallback, useEffect, useRef, useState } from "react";
import { useInstallPromptStore } from "@/store/install-prompt";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const promptRef = useRef(deferredPrompt);
  const { dismissed, dismiss } = useInstallPromptStore();

  useEffect(() => {
    promptRef.current = deferredPrompt;
  }, [deferredPrompt]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    setDeferredPrompt(null);
  }, []);

  return {
    canInstall: !dismissed && deferredPrompt !== null,
    install,
    dismiss,
  };
}
