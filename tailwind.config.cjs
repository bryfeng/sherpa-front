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
        // Snow mountain theme tokens
        snow: {
          50: "#F8FBFF",
          100: "#F1F7FE",
        },
        skyMist: {
          50: "#EAF2FB",
          100: "#E6EEF8",
        },
        glacier: {
          500: "#3B82F6",
          600: "#2563EB",
        },
        pine: {
          600: "#0E7A6B",
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
