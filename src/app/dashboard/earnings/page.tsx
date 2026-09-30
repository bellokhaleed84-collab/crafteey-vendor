"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TIER_INFO, isVendorTier, type VendorTier } from "@/lib/vendorTiers";

interface Totals {
  earnedPayoutKobo: number;
  earnedSalesKobo: number;
  earnedCommissionKobo: number;
  earnedCount: number;
  pendingPayoutKobo: number;
  pendingCount: number;
  todayPayoutKobo: number;
  todayCount: number;
  weekPayoutKobo: number;
  weekCount: number;
}

interface HistoryRow {
  _id: string;
  orderNumber?: string;
  deliveredAt: string;
  subtotalKobo: number;
  payoutKobo: number;
  commissionKobo: number;
}

interface EarningsData {
  tier: VendorTier | null;
  totals: Totals;
  history: HistoryRow[];
}

type TabKey = "overview" | "history";

// Amounts come from the server in kobo.
function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export default function EarningsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/earnings");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your earnings."));
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your earnings.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <EarningsSkeleton />;

  if (!data) {
    return (
      <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
        {error ?? "Couldn't load your earnings."}
      </p>
    );
  }

  const { totals, history, tier } = data;
  const tierInfo = isVendorTier(tier) ? TIER_INFO[tier] : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Earnings</h1>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      <Card className="bg-brand p-5">
        <p className="text-xs font-medium text-brand-ink/70">Net Earnings</p>
        <p className="mt-1 text-2xl font-bold text-brand-ink">{naira(totals.earnedPayoutKobo)}</p>
        <p className="mt-1 text-xs text-brand-ink/70">
          From {totals.earnedCount} delivered order{totals.earnedCount === 1 ? "" : "s"}
        </p>
      </Card>

      {totals.pendingCount > 0 && (
        <Card className="flex items-center justify-between bg-surface-muted p-4">
          <div>
            <p className="text-xs text-ink-muted">In progress</p>
            <p className="text-xs text-ink-faint">
              {totals.pendingCount} paid order{totals.pendingCount === 1 ? "" : "s"} not delivered yet
            </p>
          </div>
          <p className="text-lg font-bold text-ink">{naira(totals.pendingPayoutKobo)}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Item sales</p>
          <p className="mt-1 text-lg font-bold text-ink">{naira(totals.earnedSalesKobo)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Crafteey commission</p>
          <p className="mt-1 text-lg font-bold text-ink">−{naira(totals.earnedCommissionKobo)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Today</p>
          <p className="mt-1 text-lg font-bold text-ink">{naira(totals.todayPayoutKobo)}</p>
          <p className="text-xs text-ink-faint">
            {totals.todayCount} order{totals.todayCount === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">This week</p>
          <p className="mt-1 text-lg font-bold text-ink">{naira(totals.weekPayoutKobo)}</p>
          <p className="text-xs text-ink-faint">
            {totals.weekCount} order{totals.weekCount === 1 ? "" : "s"}
          </p>
        </Card>
      </div>

      <div className="flex gap-2">
        {(["overview", "history"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === t ? "bg-brand text-brand-ink" : "bg-surface-border text-ink-muted"
            }`}
          >
            {t === "overview" ? "Overview" : "Earnings History"}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <Card className="space-y-2 bg-surface-muted p-4 text-sm text-ink-muted">
          {tierInfo && (
            <p>
              Your plan is <b className="text-ink">{tierInfo.label}</b> ({tierInfo.commissionPercent}% commission).
              Each order keeps the rate from when it was placed, so a plan change only affects new orders.
            </p>
          )}
          <p>
            Earnings are your item sales minus Crafteey&apos;s commission. Delivery fees go to riders and are not
            part of your earnings.
          </p>
          <p>Payout scheduling and a Payouts tab aren&apos;t built yet.</p>
        </Card>
      ) : (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Delivered orders</h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-muted">No delivered orders yet.</p>
          ) : (
            <>
              <Card className="divide-y divide-surface-border">
                {history.map((o) => (
                  <div key={o._id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium text-ink">
                        #{o.orderNumber ?? o._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {new Date(o.deliveredAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink">{naira(o.payoutKobo)}</p>
                      <p className="text-xs text-ink-faint">of {naira(o.subtotalKobo)}</p>
                    </div>
                  </div>
                ))}
              </Card>
              {totals.earnedCount > history.length && (
                <p className="mt-2 text-center text-xs text-ink-faint">
                  Showing your latest {history.length} orders.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EarningsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}