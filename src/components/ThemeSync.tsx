"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

// Keeps the theme correct after the page loads, and follows the phone's
// light/dark setting while the choice is "Auto".
export default function ThemeSync() {
  useEffect(() => {
    applyTheme(getStoredTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "auto") applyTheme("auto");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}