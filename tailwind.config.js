/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16181F",
        panel: "#FFFFFF",
        fondo: "#F4F5F8",
        linea: "#E3E5EC",
        // Azul eléctrico del logo A&Z
        electrico: { DEFAULT: "#2E2ED0", dark: "#2323A8", pale: "#EDEDFC", glow: "#5B5BE8" },
        // Amarillo industrial de seguridad (acento de energía)
        volt: { DEFAULT: "#F5B301", dark: "#D99C00", pale: "#FFF6DC" },
        cobre: "#B4551F",
        ok: "#1F8A4C",
        alerta: "#D93A2B",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["Barlow", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,24,31,.05), 0 8px 24px rgba(22,24,31,.06)",
        pop: "0 2px 6px rgba(46,46,208,.18), 0 12px 32px rgba(46,46,208,.12)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
