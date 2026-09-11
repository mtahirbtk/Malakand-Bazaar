import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1f4d3a",
        "primary-dark": "#16382b",
        "primary-light": "#28664e",
        secondary: "#3f6b52",
        tertiary: "#c89b6d",
        "tertiary-hover": "#b88755",
        "tertiary-light": "#fdf6ed",
        background: "#f4f8f5",
        surface: "#ffffff",
        "surface-low": "#edf5ef",
        "surface-border": "#e1ebe4",
        "accent-green": "#50a23e",
        "accent-green-dark": "#418532",
        "on-surface": "#16231d",
        "on-surface-muted": "#52635a",
        danger: "#e11d48",
        "danger-soft": "#fff1f2",
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
        },
      },
      fontFamily: { sans: ["var(--font-jakarta)", "sans-serif"] },
      boxShadow: {
        "2xs": "0 1px 2px rgba(30, 41, 35, 0.04)",
        xs: "0 1px 3px rgba(30, 41, 35, 0.05)",
        raised:
          "0 2px 8px -2px rgba(30, 41, 35, 0.05), 0 1px 3px rgba(30, 41, 35, 0.04)",
        floating:
          "0 12px 32px -4px rgba(30, 41, 35, 0.08), 0 4px 12px -2px rgba(30, 41, 35, 0.04)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
