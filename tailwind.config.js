/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
        },
        cabin: {
          first: "#f59f00",
          business: "#7c3aed",
          premium: "#2563eb",
          economy: "#6b7280",
        },
        score: {
          great: "#16a34a",
          good: "#ca8a04",
          fair: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
