/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbf6",
          100: "#ddf6e6",
          200: "#beebd0",
          300: "#91d9ae",
          400: "#5fc184",
          500: "#38a95f",
          600: "#278749",
          700: "#216b3d",
          800: "#1f5533",
          900: "#1a462b"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: []
};