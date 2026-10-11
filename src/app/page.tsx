"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyVendor, routeForVendor } from "@/lib/vendorApi";

// Start page. It shows nothing of its own (just the splash purple) while it
// checks the login and sends the person to the right screen.
export default function StartPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const routed = useRef(false);

  useEffect(() => {
    if (loading || routed.current) return;

    if (!user) {
      routed.current = true;
      router.replace("/login");
      return;
    }

    routed.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/login");
          return;
        }
        const vendor = await fetchMyVendor(token);
        router.replace(vendor ? routeForVendor(vendor) : "/login");
      } catch {
        router.replace("/login");
      }
    })();
  }, [loading, user, getToken, router]);

  return <main className="min-h-screen" style={{ background: "#2A025E" }} />;
}