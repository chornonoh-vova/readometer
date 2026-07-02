import { DownloadIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="mx-2 mb-2 flex items-center justify-between gap-3 rounded-lg border bg-muted px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <DownloadIcon className="size-4 shrink-0" />
        <p className="truncate text-sm text-foreground">
          Install Readometer for quick access
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" onClick={install}>
          Install
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
