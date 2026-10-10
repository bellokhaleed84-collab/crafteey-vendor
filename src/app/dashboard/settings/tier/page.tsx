"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/Skeleton";
import TierCard from "@/components/TierCard";
import { TIER_INFO, VENDOR_TIERS, type VendorTier } from "@/lib/vendorTiers";

interface TierState {
  tier: VendorTier;
  tierRequest: {
    requestedTier: VendorTier;
    status: "pending" | "approved" | "rejected";
    requestedAt: string;
  } | null;
}

export default function TierSettingsPage() {
  const { getToken } = useAuth();
  const [state, setState] = useState<TierState | null>(null);
  const [selected, setSelected] = useState<VendorTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/tier");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your plan."));
      const data: TierState = await res.json();
      setState(data);
      setSelected((prev) => prev ?? data.tier);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your plan.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const requestChange = async () => {
    if (!selected || !state || selected === state.tier) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(getToken, "/api/vendor/tier", {
        method: "POST",
        body: JSON.stringify({ requestedTier: selected }),
      });
      if (!res.ok) {
        setError(await readError(res, "Couldn't send your request."));
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!state) {
    return (
      <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
        {error ?? "Couldn't load your plan."}
      </p>
    );
  }

  const pending = state.tierRequest?.status === "pending" ? state.tierRequest : null;
  const rejected = state.tierRequest?.status === "rejected" ? state.tierRequest : null;

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <Link href="/dashboard/settings" className="mb-2 inline-flex items-center gap-2 text-ink">
          <ChevronLeft size={22} />
          <span className="text-lg font-bold">Store Tier</span>
        </Link>
        <p className="text-sm text-ink-muted">
          Your tier sets the commission Crafteey takes on each order and how your
          store shows up in the Hub. Tier changes are reviewed by our team.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {pending && (
        <p className="rounded-xl bg-brand-light p-3 text-sm text-ink">
          Your request to move to <b>{TIER_INFO[pending.requestedTier].label}</b> is waiting
          for review. You&apos;ll stay on {TIER_INFO[state.tier].label} until it&apos;s approved.
        </p>
      )}
      {rejected && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
          Your last request to move to {TIER_INFO[rejected.requestedTier].label} was declined.
        </p>
      )}

      <div className="space-y-3">
        {VENDOR_TIERS.map((t) => (
          <TierCard
            key={t}
            tier={t}
            selected={selected === t}
            onSelect={() => setSelected(t)}
            disabled={submitting}
            badge={
              t === state.tier
                ? "Current"
                : pending?.requestedTier === t
                ? "Requested"
                : undefined
            }
          />
        ))}
      </div>

      <button
        onClick={requestChange}
        disabled={submitting || !!pending || !selected || selected === state.tier}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-50"
      >
        {submitting
          ? "Sending..."
          : selected && selected !== state.tier
          ? `Request ${TIER_INFO[selected].label}`
          : "Choose a different plan to request"}
      </button>
    </div>
  );
}