import { pixelBasedPreset, type TailwindConfig } from "react-email";

// Hex equivalents of apps/web's OKLCH theme tokens (apps/web/src/index.css) —
// email clients don't support oklch(), so the palette is duplicated here.
export default {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#0C0A09",
        primary: "#BB4D00",
        "primary-foreground": "#FFFBEB",
        secondary: "#F4F4F5",
        muted: "#F5F5F4",
        "muted-foreground": "#79716B",
        border: "#E7E5E4",
      },
      fontFamily: {
        sans: ["Inter", "Helvetica", "Arial", "sans-serif"],
      },
      borderRadius: {
        md: "8px",
        lg: "10px",
      },
    },
  },
} satisfies TailwindConfig;
