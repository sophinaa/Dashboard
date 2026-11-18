import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f2e9",
        panel: "#ede6d9",
        surface: "#fcfaf5",
        sunken: "#e4dccd",
        line: "#ddd4c4",
        "line-strong": "#b4aa98",
        night: { DEFAULT: "#17211b", 2: "#24302a", text: "#cdd5cd", muted: "#9aa69c" },
        ink: { DEFAULT: "#1b241e", 2: "#3f4841", muted: "#5a6159" },
        forest: { DEFAULT: "#1e5c3f", 700: "#174a32", 50: "#e3ede5", 100: "#cfe1d4" },
        tile: {
          sage: "#d3e4cb",
          sky: "#d3def2",
          butter: "#f5e3a3",
          blush: "#f4d2dc",
          lilac: "#e1d8f2",
          sand: "#e9dcc5",
        },
        series: { 1: "#1e7a4c", 2: "#3b6fc0", 3: "#c8602c", 4: "#8a5cc2" },
        caution: { bg: "#f8ebc9", ink: "#6a4700", line: "#e6cf8e" },
        info: { bg: "#dfe8f4", ink: "#1f4567", line: "#bccde2" },
        danger: { bg: "#f8e1de", ink: "#8a1f17", line: "#e9b5ae" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
