/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2D26F0",
          dark: "#261FD1",
          light: "#4E48F9",
          softer: "#D9D8FE",
        },
        indigo: {
          DEFAULT: "#6366F1",
        },
        danger: "#EF4444",
        warning: "#F59E0B",
        success: "#10B981",
        info: "#3B82F6",
      },
    },
  },
  plugins: [],
};
