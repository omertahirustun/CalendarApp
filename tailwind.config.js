/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          dark: "#6D28D9",
          light: "#8B5CF6",
          softer: "#EDE9FE",
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
