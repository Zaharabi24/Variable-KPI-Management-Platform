import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6f2",
          100: "#d6eadf",
          200: "#aed5c0",
          300: "#7dba9c",
          400: "#4c9a78",
          500: "#2f7d5c",
          600: "#1f6448",
          700: "#174f3a",
          800: "#123d2e",
          900: "#0d2f24",
          950: "#071a14",
        },
        surface: "#f6f7f5",
        ink: {
          900: "#0f1a15",
          700: "#2b3a33",
          500: "#5d6b64",
          400: "#7f8c85",
          300: "#a6b0aa",
          200: "#d8ded9",
          100: "#e9ede9",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,26,21,0.04), 0 1px 3px rgba(15,26,21,0.06)",
        pop: "0 10px 30px -10px rgba(15,26,21,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
