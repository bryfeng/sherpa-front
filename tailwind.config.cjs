/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
        },
        friendly: "#10b981",
        technical: "#8b5cf6",
        professional: "#0f172a",
        educational: "#f59e0b",
      }
    },
  },
  plugins: [],
};

