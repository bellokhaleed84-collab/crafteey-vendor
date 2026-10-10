import type { Config } from "tailwindcss";

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
          dark: "#D9A400",
          light: "#FFF6D6",
          ink: "#1A1A1A"
        },
        navy: {
          DEFAULT: "#1C1566",
          soft: "#2A2080"
        },
        promo: "#5B21B6",
        ink: {
          DEFAULT: "#1A1A1A",
          muted: "#6B7280",
          faint: "#9CA3AF"
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F7F8FA",
          border: "#E9ECF0"
        },
        status: {
          success: "#16A34A",
          "success-bg": "#ECFDF3",
          warning: "#D97706",
          "warning-bg": "#FFF7ED",
          danger: "#DC2626",
          "danger-bg": "#FEF2F2",
          info: "#2563EB",
          "info-bg": "#EFF6FF",
          new: "#2563EB",
          "new-bg": "#EFF6FF",
          preparing: "#D97706",
          "preparing-bg": "#FFF7ED",
          ready: "#B45309",
          "ready-bg": "#FFFBEB",
          delivered: "#16A34A",
          "delivered-bg": "#ECFDF3",
          cancelled: "#DC2626",
          "cancelled-bg": "#FEF2F2"
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