import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Brand Colours ──────────────────────────────────────────────────
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",  // primary
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        trust: {
          bronze:   "#cd7f32",
          silver:   "#a8a9ad",
          gold:     "#ffd700",
          platinum: "#e5e4e2",
        },
        status: {
          verified:  "#10b981",
          pending:   "#f59e0b",
          rejected:  "#ef4444",
          suspended: "#6b7280",
        },
      },

      // ── Typography ─────────────────────────────────────────────────────
      fontFamily: {
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:  ["var(--font-mono)", "monospace"],
      },

      // ── Spacing / Sizing ───────────────────────────────────────────────
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },

      // ── Border Radius ─────────────────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
      },

      // ── Box Shadow ────────────────────────────────────────────────────
      boxShadow: {
        "card":    "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "card-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "glow":    "0 0 20px rgb(99 102 241 / 0.35)",
        "glow-sm": "0 0 10px rgb(99 102 241 / 0.25)",
      },

      // ── Keyframes / Animations ────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgb(99 102 241 / 0.3)" },
          "50%":      { boxShadow: "0 0 25px rgb(99 102 241 / 0.6)" },
        },
        "score-fill": {
          "0%":   { strokeDashoffset: "314" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-in":    "fade-in 0.3s ease-out",
        "slide-in":   "slide-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "score-fill": "score-fill 1.2s ease-out forwards",
      },

      // ── Background Images ─────────────────────────────────────────────
      backgroundImage: {
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":   "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "grid-pattern":     "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(99 102 241 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
      },
    },
  },
  plugins: [],
};

export default config;
