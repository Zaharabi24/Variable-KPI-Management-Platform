import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Anwar brand master colour #DE3332 with white
        brand: {
          50: "#fdf3f3",
          100: "#fbe3e3",
          200: "#f7c6c5",
          300: "#f09c9b",
          400: "#e86a69",
          500: "#de3332",
          600: "#c72c2b",
          700: "#a62423",
          800: "#881e1d",
          900: "#701a19",
          950: "#3e0b0b",
        },
        // Neutrals carry a slight cool tint so white cards sit cleanly on the canvas
        surface: "#f6f6f8",
        ink: {
          900: "#18181b",
          700: "#3a3a40",
          500: "#6b6b74",
          400: "#8a8a93",
          300: "#b1b1b9",
          200: "#dedee3",
          100: "#eeeef1",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        // Layered elevation: a tight contact shadow plus a soft ambient one
        card: "0 1px 2px rgba(24,24,27,0.04), 0 4px 16px -4px rgba(24,24,27,0.06)",
        lift: "0 2px 4px rgba(24,24,27,0.04), 0 12px 28px -8px rgba(24,24,27,0.12)",
        pop: "0 4px 10px -2px rgba(24,24,27,0.08), 0 24px 56px -12px rgba(24,24,27,0.28)",
        field: "0 1px 2px rgba(24,24,27,0.04)",
        button: "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(136,30,29,0.3), 0 4px 10px -4px rgba(222,51,50,0.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
