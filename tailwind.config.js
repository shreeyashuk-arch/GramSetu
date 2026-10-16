/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gram: {
          primary: "#15803d", // Deep rural green
          primaryHover: "#166534",
          secondary: "#d97706", // Warm amber / saffron
          secondaryHover: "#b45309",
          dark: "#0f172a",
          card: "#ffffff",
          muted: "#64748b",
          danger: "#dc2626",
          warning: "#f59e0b",
          info: "#0284c7",
          success: "#16a34a",
          earth: "#f8fafc",
          surface: "#f1f5f9"
        }
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      }
    },
  },
  plugins: [],
};
