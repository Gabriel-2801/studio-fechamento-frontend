/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#241c19",
        paper: "#f3eee7",
        card: "#fffdfb",
        line: "#e4dad1",
        accent: "#9c3b4c",
        moss: "#2c5b4e",
        muted: "#74685f",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(36,28,25,.04), 0 16px 40px rgba(36,28,25,.05)",
      },
    },
  },
  plugins: [],
};
