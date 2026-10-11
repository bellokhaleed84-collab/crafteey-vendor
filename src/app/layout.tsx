import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ThemeSync from "@/components/ThemeSync";
import { DEFAULT_THEME, THEME_KEY } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Crafteey Vendor",
  description: "Manage your store, menu and orders on Crafteey"
};

// Runs before the page paints so there is no white flash in dark mode.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"${DEFAULT_THEME}";var d=t==="dark"||(t==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <ThemeSync />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}