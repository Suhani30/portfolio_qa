/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          50: "#f7f8f8",
          100: "#eceeef",
          200: "#d6dadc",
          300: "#b3babe",
          400: "#89939a",
          500: "#6b757c",
          600: "#545d63",
          700: "#3a4146",
          800: "#22272b",
          850: "#181c1f",
          900: "#111416",
          950: "#0a0c0d",
        },
        pass: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: { "0%,49%": { opacity: "1" }, "50%,100%": { opacity: "0" } },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        crawl: {
          "0%,100%": { transform: "translate(0,0) rotate(-8deg)" },
          "25%": { transform: "translate(2px,-2px) rotate(6deg)" },
          "50%": { transform: "translate(-1px,1px) rotate(-4deg)" },
          "75%": { transform: "translate(-2px,-1px) rotate(10deg)" },
        },
        splat: {
          "0%": { transform: "scale(0.2) rotate(0deg)", opacity: "1" },
          "60%": { transform: "scale(1.15) rotate(25deg)", opacity: "0.9" },
          "100%": { transform: "scale(1) rotate(30deg)", opacity: "0" },
        },
        "float-up": {
          "0%": { transform: "translate(-50%, 6px)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translate(-50%, -22px)", opacity: "0" },
        },
        pop: {
          "0%": { transform: "scale(0.94) translateY(8px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0.8" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        blink: "blink 1s steps(1) infinite",
        scan: "scan 6s linear infinite",
        crawl: "crawl 1.1s ease-in-out infinite",
        splat: "splat 0.9s ease-out forwards",
        "float-up": "float-up 0.9s ease-out forwards",
        pop: "pop 0.35s cubic-bezier(0.22,1,0.36,1) both",
        confetti: "confetti 3s cubic-bezier(0.25,0.6,0.4,1) forwards",
      },
    },
  },
  plugins: [],
};
