import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fbf9f5",
        "paper-warm": "#fdfbf7",
        "paper-card": "#fffdf8",
        ink: "#2d2d2d",
        muted: "#777871",
        line: "#d9d2c6",
        red: {
          DEFAULT: "#ff4d4d",
          dark: "#b71422",
          wash: "#fae6e1",
        },
        blue: {
          DEFAULT: "#2d5da1",
          dark: "#315b8b",
          wash: "#e2eef4",
        },
        lilac: "#ece7f5",
        green: "#dfeee2",
        yellow: "#fff1b5",
      },
      fontFamily: {
        display: ["Kalam", "cursive"],
        body: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      boxShadow: {
        hard: "4px 5px 0 #292a27",
        "hard-sm": "3px 3px 0 #292a27",
        "hard-pressed": "1px 1px 0 #292a27",
        soft: "0 12px 28px rgba(52,48,40,.08)",
      },
      backgroundImage: {
        "dot-pattern": "radial-gradient(rgba(79,75,67,.15) .7px, transparent .7px)",
        "dot-size": "18px 18px",
      },
      borderRadius: {
        organic: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
