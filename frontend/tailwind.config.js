/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // "The marked exam paper": ink on paper, fountain-pen blue for actions,
        // a highlighter for key terms, and the examiner's red pen for marks.
        ink: {
          DEFAULT: "#1B2A4A",
          soft: "#3D4B68",
          muted: "#6A7590",
          faint: "#9AA3B6",
        },
        pen: {
          DEFAULT: "#2340B8",
          dark: "#1A3190",
          wash: "#E8ECFA",
        },
        paper: "#FFFFFF",
        desk: "#EEF1F6",
        rule: {
          DEFAULT: "#D5DBE6",
          soft: "#E6EAF1",
        },
        highlight: {
          DEFAULT: "#FFE45C",
          soft: "#FFF4B8",
        },
        marker: {
          DEFAULT: "#C8283A",
          wash: "#FBE9EB",
        },
        right: {
          DEFAULT: "#1E7F55",
          wash: "#E4F3EC",
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', "ui-sans-serif", "system-ui", "sans-serif"],
        hand: ["Caveat", '"Segoe Print"', '"Bradley Hand"', "cursive"],
      },
      fontSize: {
        // Modular scale (~1.25) — body 16px
        "display": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        "title": ["2.25rem", { lineHeight: "1.12", letterSpacing: "-0.015em", fontWeight: "700" }],
        "heading": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
      },
      boxShadow: {
        sheet: "0 1px 0 rgba(27,42,74,0.04), 0 8px 24px -12px rgba(27,42,74,0.18)",
      },
      keyframes: {
        markIn: {
          "0%": { opacity: "0", transform: "scale(1.35) rotate(-10deg)" },
          "60%": { opacity: "1", transform: "scale(0.96) rotate(-4deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-5deg)" },
        },
        drawRing: {
          "0%": { strokeDashoffset: "var(--ring-length)" },
          "100%": { strokeDashoffset: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "mark-in": "markIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "draw-ring": "drawRing 0.9s ease-out 0.15s both",
        "fade-in": "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
