import type { Config } from "tailwindcss";

// Colours that change in dark mode read their value from CSS variables
// (defined in globals.css). "<alpha-value>" keeps classes like bg-surface/95 working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FFC800",
          dark: v("brand-dark"),
          light: v("brand-light"),
          ink: "#1A1A1A"
        },
        navy: {
          DEFAULT: "#1C1566",
          soft: "#2A2080"
        },
        promo: "#5B21B6",
        page: v("page"),
        ink: {
          DEFAULT: v("ink"),
          muted: v("ink-muted"),
          faint: v("ink-faint")
        },
        surface: {
          DEFAULT: v("surface"),
          muted: v("surface-muted"),
          border: v("surface-border")
        },
        status: {
          success: v("status-success"),
          "success-bg": v("status-success-bg"),
          warning: v("status-warning"),
          "warning-bg": v("status-warning-bg"),
          danger: v("status-danger"),
          "danger-bg": v("status-danger-bg"),
          info: v("status-info"),
          "info-bg": v("status-info-bg"),
          new: v("status-new"),
          "new-bg": v("status-new-bg"),
          preparing: v("status-preparing"),
          "preparing-bg": v("status-preparing-bg"),
          ready: v("status-ready"),
          "ready-bg": v("status-ready-bg"),
          delivered: v("status-delivered"),
          "delivered-bg": v("status-delivered-bg"),
          cancelled: v("status-cancelled"),
          "cancelled-bg": v("status-cancelled-bg")
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)"
      }
    }
  },
  plugins: []
};

export default config;