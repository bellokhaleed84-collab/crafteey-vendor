"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyVendor } from "@/lib/vendorApi";
import { isVendorApproved } from "@/lib/vendorApproval";

// Only lets approved vendors see what's inside. Everyone else is sent to
// /login (signed out) or /pending (not approved, rejected, suspended, or
// no profile).
export default function VendorGuard({ children }: { children: ReactNode }) {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/login");
          return;
        }
        const vendor = await fetchMyVendor(token);
        if (cancelled) return;
        if (!vendor || !isVendorApproved(vendor)) {
          router.replace("/pending");
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) {
          setError("Couldn't verify your account. Check your connection and refresh.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, getToken, router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}