import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx}", "../../packages/ui/src/**/*.{vue,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      // shadcn-vue HSL color tokens
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Severity (kept for chips)
        severity: {
          critical: "#ef4444",
          high:     "#f97316",
          medium:   "#f59e0b",
          low:      "#6b7280",
        },
      },
      borderRadius: {
        lg:    "var(--radius)",
        md:    "calc(var(--radius) - 2px)",
        sm:    "calc(var(--radius) - 4px)",
        xl:    "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        full:  "9999px",
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "15px", letterSpacing: "0.04em" }],
        xs:    ["12px", { lineHeight: "17px" }],
        sm:    ["13px", { lineHeight: "19px" }],
        base:  ["14px", { lineHeight: "21px" }],
        lg:    ["16px", { lineHeight: "24px" }],
        xl:    ["18px", { lineHeight: "28px" }],
        "2xl": ["22px", { lineHeight: "32px" }],
      },
    },
  },
  plugins: [typography, animate],
} satisfies Config;
