"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyVendor } from "@/lib/vendorApi";
import { fetchMyStaffAccess } from "@/lib/staffApi";
import { isVendorApproved } from "@/lib/vendorApproval";
import { StoreAccessProvider, type StoreAccessValue } from "@/contexts/StoreRoleContext";
import VerifyEmailScreen from "@/components/VerifyEmailScreen";

// Lets in approved store owners and active staff. Everyone else is sent to
// /login (signed out) or /pending (no approved store). Invited staff who haven't
// verified their email yet see a verify screen.
export default function VendorGuard({ children }: { children: ReactNode }) {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "verify">("checking");
  const [access, setAccess] = useState<StoreAccessValue>({ role: "owner", storeName: null });
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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

        if (vendor) {
          if (!isVendorApproved(vendor)) {
            router.replace("/pending");
            return;
          }
          setAccess({ role: "owner", storeName: null });
          setState("ready");
          return;
        }

        // No store of their own: are they staff somewhere?
        const staff = await fetchMyStaffAccess(token);
        if (cancelled) return;

        if (staff.kind === "staff") {
          setAccess({ role: "staff", storeName: staff.storeName });
          setState("ready");
          return;
        }
        if (staff.kind === "needs_verification") {
          setState("verify");
          return;
        }
        router.replace("/pending");
      } catch {
        if (!cancelled) {
          setError("Couldn't verify your account. Check your connection and refresh.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, getToken, router, attempt]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
      </main>
    );
  }

  if (state === "verify") {
    return <VerifyEmailScreen onChecked={() => setAttempt((n) => n + 1)} />;
  }

  if (state !== "ready") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return <StoreAccessProvider value={access}>{children}</StoreAccessProvider>;
}