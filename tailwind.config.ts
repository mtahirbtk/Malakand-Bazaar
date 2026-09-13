import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * Brand tonal ramp. One hue (~155deg), ten steps, so hierarchy comes
         * from tone rather than from four similar-weight greens competing.
         * Role assignment lives in docs/palette.md — read it before reaching
         * for a colour.
         */
        brand: {
          50: "#f0f9f5",
          100: "#def2e8",
          200: "#bce1d0",
          300: "#8ec7af",
          400: "#59ab89",
          500: "#3d8f6e",
          600: "#2d7659",
          700: "#255f48",
          800: "#1f4d3a",
          900: "#133426",
        },
        primary: "#1f4d3a",
        "primary-dark": "#16382b",
        "primary-light": "#28664e",
        secondary: "#3f6b52",
        tertiary: "#c89b6d",
        "tertiary-hover": "#b88755",
        "tertiary-light": "#fdf6ed",
        /** White text on sand fails WCAG AA (2.51:1) — this darker tone is
         *  6.27:1, the one sand-family ground safe for white text.
         *  docs/palette.md, "Accent roles". */
        "tertiary-dark": "#875520",
        background: "#f4f8f5",
        surface: "#ffffff",
        "surface-low": "#edf5ef",
        "surface-border": "#e1ebe4",
        "accent-green": "#50a23e",
        "accent-green-dark": "#418532",
        "accent-green-darker": "#35691f",
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
