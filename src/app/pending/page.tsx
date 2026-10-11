"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, XCircle, Ban, Store, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { fetchMyVendor, type VendorProfile } from "@/lib/vendorApi";
import { fetchMyStaffAccess } from "@/lib/staffApi";
import { isVendorApproved } from "@/lib/vendorApproval";
import { Skeleton } from "@/components/ui/Skeleton";
import DocumentsPanel, { type DocsInfo } from "@/components/DocumentsPanel";

type StepState = "done" | "current" | "todo" | "stopped";

function Step({ state, label, hint }: { state: StepState; label: string; hint?: string }) {
  const dot =
    state === "done"
      ? "bg-status-success text-white"
      : state === "current"
        ? "bg-brand text-brand-ink"
        : state === "stopped"
          ? "bg-status-danger text-white"
          : "bg-surface-border text-ink-faint";
  return (
    <li className="flex items-start gap-3 text-left">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dot}`}>
        {state === "done" ? (
          <Check size={14} />
        ) : state === "stopped" ? (
          <XCircle size={14} />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    </li>
  );
}

export default function PendingPage() {
  const { user, loading: authLoading, getToken, signOut } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [info, setInfo] = useState<DocsInfo | null>(null);
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
      if (isVendorApproved(v)) {
        router.replace("/dashboard");
        return;
      }
      try {
        const res = await apiFetch(getToken, "/api/vendor/documents");
        if (res.ok) setInfo(await res.json());
      } catch {
        // The status screen still works without the documents list.
      }
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

  const status = info?.status ?? vendor?.status;
  const rejected = status === "rejected";
  const suspended = status === "suspended";
  const reason = info?.rejectionReason ?? "";
  const docCount = info?.documents.length ?? 0;
  const showSteps = !missing && !suspended && !!vendor;

  let icon = <Clock size={30} />;
  let iconBox = "bg-brand-light text-brand-dark";
  if (missing) {
    icon = <Store size={30} />;
  } else if (rejected) {
    icon = <XCircle size={30} />;
    iconBox = "bg-status-danger-bg text-status-danger";
  } else if (suspended) {
    icon = <Ban size={30} />;
    iconBox = "bg-status-danger-bg text-status-danger";
  }

  const steps: { label: string; hint: string; state: StepState }[] = [
    { label: "Store registered", hint: vendor?.businessName ?? "", state: "done" },
    {
      label: "Documents",
      hint: docCount > 0 ? `${docCount} sent` : "Upload your CAC and ID below",
      state: docCount > 0 ? "done" : "current",
    },
    {
      label: "Review by our team",
      hint: rejected ? "Needs changes, see above" : "We check your details",
      state: rejected ? "stopped" : docCount > 0 ? "current" : "todo",
    },
    { label: "Approved", hint: "Your store goes live in the Hub", state: "todo" },
  ];

  return (
    <main className="min-h-screen bg-surface px-5 py-8">
      <div className="mx-auto w-full max-w-sm space-y-5">
        {checking && !vendor && !missing ? (
          <div className="space-y-3">
            <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
            <Skeleton className="mx-auto h-6 w-56" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="space-y-3 text-center">
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
                    <b className="text-ink">Staff:</b> ask your store owner to add this exact email in Settings{" "}
                    {"\u2192"} Staff, then tap Check again.
                  </p>
                  <p className="text-sm text-ink-muted">
                    <b className="text-ink">Store owner:</b>{" "}
                    <Link href="/register" className="font-semibold text-brand-dark underline">
                      register your store
                    </Link>
                    .
                  </p>
                </>
              ) : rejected ? (
                <>
                  <h1 className="text-2xl font-bold text-ink">Application not approved</h1>
                  <p className="text-sm text-ink-muted">{vendor?.businessName} wasn&apos;t approved yet.</p>
                  {reason && (
                    <div className="rounded-xl bg-status-danger-bg p-3 text-left text-sm text-status-danger">
                      <p className="text-xs font-bold uppercase">What to fix</p>
                      <p className="mt-1">{reason}</p>
                    </div>
                  )}
                  <p className="text-sm text-ink-muted">
                    Upload a new document below and we will review your store again.
                  </p>
                </>
              ) : suspended ? (
                <>
                  <h1 className="text-2xl font-bold text-ink">Store suspended</h1>
                  <p className="text-sm text-ink-muted">
                    {vendor?.businessName} has been suspended. Please contact support to get it reinstated.
                  </p>
                  {reason && (
                    <div className="rounded-xl bg-status-danger-bg p-3 text-left text-sm text-status-danger">
                      <p className="text-xs font-bold uppercase">Reason</p>
                      <p className="mt-1">{reason}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-ink">Your store is under review</h1>
                  <p className="text-sm text-ink-muted">
                    Thanks for registering{vendor ? `, ${vendor.businessName}` : ""}.{" "}
                    {docCount > 0
                      ? "Our team is verifying your details. This page updates automatically once you're approved."
                      : "Upload your documents below so our team can verify you."}
                  </p>
                </>
              )}
            </div>

            {showSteps && (
              <ol className="space-y-3 rounded-2xl border border-surface-border bg-surface p-4">
                {steps.map((s) => (
                  <Step key={s.label} state={s.state} label={s.label} hint={s.hint} />
                ))}
              </ol>
            )}

            {showSteps &&
              (info ? (
                <DocumentsPanel documents={info.documents} onChanged={load} />
              ) : checking ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              ) : (
                <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
                  Couldn&apos;t load your documents. Tap Check again.
                </p>
              ))}
          </>
        )}

        {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              setChecking(true);
              load();
            }}
            className="flex-1 rounded-xl border border-surface-border bg-surface py-3.5 text-sm font-semibold text-ink"
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