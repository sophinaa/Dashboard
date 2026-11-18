import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f3ec",
        surface: "#fffdf9",
        sunken: "#efe9df",
        line: "#ddd5c8",
        "line-strong": "#b9b0a1",
        ink: { DEFAULT: "#1d2620", 2: "#434c45", muted: "#5d645d" },
        forest: { DEFAULT: "#1e5c3f", 700: "#174a32", 50: "#e6efe9", 100: "#cfe1d6" },
        series: { 1: "#1e7a4c", 2: "#3b6fc0", 3: "#c8602c", 4: "#8a5cc2" },
        caution: { bg: "#fbf1dc", ink: "#6e4a00", line: "#e8cf98" },
        info: { bg: "#e9f0f6", ink: "#1f4567", line: "#bcd0e2" },
        danger: { bg: "#fbe8e6", ink: "#8a1f17", line: "#ebbab4" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(29,38,32,0.05), 0 1px 1px rgba(29,38,32,0.03)",
      },
    },
  },
  plugins: [],
} satisfies Config;
