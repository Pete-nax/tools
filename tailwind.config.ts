import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#0B0E14",
          panel: "#131826",
          panel2: "#1A2033",
          border: "#232A3B",
          void: "#070A11",
        },
        ink: {
          DEFAULT: "#E6E9F0",
          muted: "#8891A6",
          faint: "#5B6478",
        },
        status: {
          up: "#2FBF8F",
          warn: "#F5A623",
          down: "#EF4444",
          info: "#4C8DFF",
        },
        "accent-cyan": "#00E5FF",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        data: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
