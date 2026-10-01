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
        surface: "#f7f7f7",
        ink: {
          900: "#171717",
          700: "#333333",
          500: "#6b6b6b",
          400: "#8a8a8a",
          300: "#ababab",
          200: "#dcdcdc",
          100: "#ededed",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
        pop: "0 10px 30px -10px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
