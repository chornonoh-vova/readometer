import { type CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import { useThemeStore } from "@/store/theme";

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <Sonner
      theme={theme}
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      offset={{
        top: "max(env(safe-area-inset-top, 0), 32px)",
        right: "max(env(safe-area-inset-right, 0), 32px)",
        bottom: "max(env(safe-area-inset-bottom, 0), 32px)",
        left: "max(env(safe-area-inset-left, 0), 32px)",
      }}
      mobileOffset={{
        top: "max(env(safe-area-inset-top, 0), 16px)",
        right: "max(env(safe-area-inset-right, 0), 16px)",
        bottom: "max(env(safe-area-inset-bottom, 0), 16px)",
        left: "max(env(safe-area-inset-left, 0), 16px)",
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
