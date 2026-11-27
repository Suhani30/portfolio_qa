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
        /* Mauve-tinted neutrals (deep indigo-plum in dark mode). */
        ink: {
          50: "#f9f6fb",
          100: "#f1ebf6",
          200: "#e0d6ea",
          300: "#c3b6d3",
          400: "#9b8db2",
          500: "#796b91",
          600: "#5e5176",
          700: "#463c5c",
          800: "#2c2542",
          850: "#221c36",
          900: "#18132a",
          950: "#0f0b1d",
        },
        /* Main accent: mauve pink. (Kept under the name "pass" so every component picks it up.) */
        pass: {
          50: "#fdf2f8",
          100: "#fce6f2",
          200: "#f9cde4",
          300: "#f4a6cd",
          400: "#ec7fb5",
          500: "#dc619e",
          600: "#bd4a85",
          700: "#9a3b6d",
          800: "#783259",
          900: "#5c2947",
        },
        mauve: {
          50: "#f9f4fa",
          100: "#f1e5f3",
          200: "#e2cbe6",
          300: "#cda7d3",
          400: "#b484bc",
          500: "#9b6ba3",
          600: "#805688",
          700: "#67466e",
          800: "#4f3855",
          900: "#3b2b40",
        },
        periwinkle: {
          50: "#f1f5ff",
          100: "#e3eaff",
          200: "#c9d6ff",
          300: "#a6bbff",
          400: "#8099fb",
          500: "#6479f1",
          600: "#4f5ee0",
          700: "#424cc0",
          800: "#38409b",
          900: "#31397a",
        },
        /* Old accent names now map onto the new palette. */
        emerald: {
          50: "#f9f4fa", 100: "#f1e5f3", 200: "#e2cbe6", 300: "#cda7d3", 400: "#b484bc",
          500: "#9b6ba3", 600: "#805688", 700: "#67466e", 800: "#4f3855", 900: "#3b2b40",
        },
        teal: {
          50: "#f1f5ff", 100: "#e3eaff", 200: "#c9d6ff", 300: "#a6bbff", 400: "#8099fb",
          500: "#6479f1", 600: "#4f5ee0", 700: "#424cc0", 800: "#38409b", 900: "#31397a",
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        aurora: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.15)" },
          "66%": { transform: "translate(-30px,20px) scale(0.9)" },
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
        marquee: "marquee 40s linear infinite",
        aurora: "aurora 16s ease-in-out infinite",
        confetti: "confetti 3s cubic-bezier(0.25,0.6,0.4,1) forwards",
      },
    },
  },
  plugins: [],
};
