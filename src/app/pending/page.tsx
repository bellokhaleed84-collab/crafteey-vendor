"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, XCircle, Ban, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyVendor, type VendorProfile } from "@/lib/vendorApi";
import { fetchMyStaffAccess } from "@/lib/staffApi";
import { isVendorApproved } from "@/lib/vendorApproval";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PendingPage() {
  const { user, loading: authLoading, getToken, signOut } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [missing, setMissing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const v = await fetchMyVendor(token);
      if (!v) {
        // No store of their own: maybe they've been added as staff since.
        const staff = await fetchMyStaffAccess(token);
        if (staff.kind === "staff" || staff.kind === "needs_verification") {
          // The dashboard guard shows the orders screen or the verify screen.
          router.replace("/dashboard");
          return;
        }
        setMissing(true);
        return;
      }
      setMissing(false);
      setVendor(v);
      if (isVendorApproved(v)) router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check your status.");
    } finally {
      setChecking(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    load();
    // Re-check every 30s so approval shows up without a manual refresh.
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [authLoading, user, load, router]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const status = vendor?.status;

  let icon = <Clock size={30} />;
  let iconBox = "bg-brand-light text-brand-dark";
  if (missing) {
    icon = <Store size={30} />;
  } else if (status === "rejected") {
    icon = <XCircle size={30} />;
    iconBox = "bg-status-danger-bg text-status-danger";
  } else if (status === "suspended") {
    icon = <Ban size={30} />;
    iconBox = "bg-status-danger-bg text-status-danger";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        {checking && !vendor && !missing ? (
          <div className="space-y-3">
            <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
            <Skeleton className="mx-auto h-6 w-56" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${iconBox}`}>
              {icon}
            </div>

            {missing ? (
              <>
                <h1 className="text-2xl font-bold text-ink">No store found</h1>
                <p className="text-sm text-ink-muted">This account isn&apos;t linked to a store yet.</p>
                {user?.email && (
                  <p className="text-sm text-ink-muted">
                    Signed in as <b className="break-all text-ink">{user.email}</b>
                  </p>
                )}
                <p className="text-sm text-ink-muted">
                  <b className="text-ink">Staff:</b> ask your store owner to add this exact email in Settings {"\u2192"}{" "}
                  Staff, then tap Check again.
                </p>
                <p className="text-sm text-ink-muted">
                  <b className="text-ink">Store owner:</b>{" "}
                  <Link href="/register" className="font-semibold text-brand-dark underline">
                    register your store
                  </Link>
                  .
                </p>
              </>
            ) : status === "rejected" ? (
              <>
                <h1 className="text-2xl font-bold text-ink">Application not approved</h1>
                <p className="text-sm text-ink-muted">
                  {vendor?.businessName} wasn&apos;t approved. Please contact support if you think this is a
                  mistake.
                </p>
              </>
            ) : status === "suspended" ? (
              <>
                <h1 className="text-2xl font-bold text-ink">Store suspended</h1>
                <p className="text-sm text-ink-muted">
                  {vendor?.businessName} has been suspended. Please contact support to find out why and how to get it
                  reinstated.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-ink">Your store is under review</h1>
                <p className="text-sm text-ink-muted">
                  Thanks for registering{vendor ? `, ${vendor.businessName}` : ""}. Our team is verifying your
                  details. This page updates automatically once you&apos;re approved.
                </p>
              </>
            )}
          </>
        )}

        {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              setChecking(true);
              load();
            }}
            className="flex-1 rounded-xl border border-surface-border bg-white py-3.5 text-sm font-semibold text-ink"
          >
            Check again
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}