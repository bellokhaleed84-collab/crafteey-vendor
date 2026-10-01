"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyVendor, type VendorProfile } from "@/lib/vendorApi";
import { fetchMyStaffAccess } from "@/lib/staffApi";
import { isVendorApproved } from "@/lib/vendorApproval";

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

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        {checking && !vendor && !missing ? (
          <p className="text-sm text-gray-600">Checking your application…</p>
        ) : missing ? (
          <>
            <h1 className="text-2xl font-bold">No store found</h1>
            <p className="text-sm text-gray-600">
              This account isn&apos;t linked to a store yet.
            </p>
            {user?.email && (
              <p className="text-sm text-gray-600">
                Signed in as <b className="break-all">{user.email}</b>
              </p>
            )}
            <p className="text-sm text-gray-600">
              <b>Staff:</b> ask your store owner to add this exact email in Settings → Staff, then
              tap Check again.
            </p>
            <p className="text-sm text-gray-600">
              <b>Store owner:</b>{" "}
              <Link href="/register" className="font-semibold underline">
                register your store
              </Link>
              .
            </p>
          </>
        ) : status === "rejected" ? (
          <>
            <h1 className="text-2xl font-bold">Application not approved</h1>
            <p className="text-sm text-gray-600">
              {vendor?.businessName} wasn&apos;t approved. Please contact
              support if you think this is a mistake.
            </p>
          </>
        ) : status === "suspended" ? (
          <>
            <h1 className="text-2xl font-bold">Store suspended</h1>
            <p className="text-sm text-gray-600">
              {vendor?.businessName} has been suspended. Please contact
              support to find out why and how to get it reinstated.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Your store is under review</h1>
            <p className="text-sm text-gray-600">
              Thanks for registering{vendor ? `, ${vendor.businessName}` : ""}.
              Our team is verifying your details. This page updates
              automatically once you&apos;re approved.
            </p>
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setChecking(true);
              load();
            }}
            className="flex-1 border py-2 rounded-lg font-semibold"
          >
            Check again
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-brand text-white py-2 rounded-lg font-semibold"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}