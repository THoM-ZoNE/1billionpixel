/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:  { DEFAULT: "#7C3AED", light: "#A78BFA", dark: "#5B21B6" },
        canvas: { bg: "#0a0a0a", grid: "#1a1a1a" },
      },
      fontFamily: { pixel: ['"Press Start 2P"', "monospace"] },
      animation:  { pulse_slow: "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite" },
    },
  },
  plugins: [],
};
