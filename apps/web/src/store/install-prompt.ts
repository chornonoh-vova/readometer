import { create } from "zustand";
import { persist } from "zustand/middleware";

type InstallPromptState = {
  dismissed: boolean;
  dismiss: () => void;
};

export const useInstallPromptStore = create<InstallPromptState>()(
  persist(
    (set) => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true }),
    }),
    { name: "pwa-install-dismissed" },
  ),
);
