import type { Config } from "tailwindcss";

// Design tokens for Drea Online Fashion — a modern women's boutique.
// Palette: warm ivory ground, deep botanical green as the primary brand
// color (a nod to lushness/Trinidad, and distinct from the generic
// cream+terracotta AI-default), warm brass as the CTA/accent color
// (echoes gold jewelry styling in the product photography).
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF7F1",
        surface: "#FFFFFF",
        charcoal: "#1D1B18",
        forest: {
          DEFAULT: "#243B2E",
          light: "#2F4B3A",
          dark: "#162419",
        },
        brass: {
          DEFAULT: "#B8863F",
          light: "#D2A45E",
          dark: "#8F6A2F",
        },
        taupe: "#A79A89",
        line: "#E7E0D4",
        error: "#A23B33",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body: ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        wideish: "0.06em",
      },
      maxWidth: {
        content: "1400px",
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
