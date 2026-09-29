"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Order {
  _id: string;
  subtotal: number;
  total: number;
  status: string;
  createdAt: string;
}

const COMMISSION_RATE = 0.15; // TODO: replace with the vendor's real tier rate

type TabKey = "overview" | "history";

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

export default function EarningsPage() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/orders?status=delivered");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your earnings."));
      const data = await res.json();
      setOrders(data.orders ?? []);
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

  // Item-subtotal is what commission applies to — delivery fees are not
  // vendor income (riders keep 80%, per the platform's delivery-fee model),
  // so they're intentionally excluded here rather than shown as earnings.
  const itemSales = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const commission = itemSales * COMMISSION_RATE;
  const netEarnings = itemSales - commission;

  const today = new Date();
  const todaySales = orders
    .filter((o) => isSameDay(o.createdAt, today))
    .reduce((sum, o) => sum + o.subtotal, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Earnings</h1>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      <Card className="bg-brand p-5">
        <p className="text-xs font-medium text-brand-ink/70">Net Earnings</p>
        <p className="mt-1 text-2xl font-bold text-brand-ink">₦{Math.round(netEarnings).toLocaleString()}</p>
        <p className="mt-1 text-xs text-brand-ink/70">From {orders.length} delivered order{orders.length === 1 ? "" : "s"}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Item Sales</p>
          <p className="mt-1 text-lg font-bold text-ink">₦{itemSales.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Craftey Commission ({Math.round(COMMISSION_RATE * 100)}%)</p>
          <p className="mt-1 text-lg font-bold text-ink">−₦{Math.round(commission).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Today&apos;s item sales</p>
          <p className="mt-1 text-lg font-bold text-ink">₦{todaySales.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Orders completed</p>
          <p className="mt-1 text-lg font-bold text-ink">{orders.length}</p>
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
        <Card className="bg-surface-muted p-4 text-sm text-ink-muted">
          Delivery fees are paid to riders, not deducted from your earnings — this
          total reflects item sales only. Payout scheduling and a Payouts tab
          aren&apos;t built yet.
        </Card>
      ) : (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Delivered orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-ink-muted">No delivered orders yet.</p>
          ) : (
            <Card className="divide-y divide-surface-border">
              {[...orders]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((o) => {
                  const orderCommission = o.subtotal * COMMISSION_RATE;
                  return (
                    <div key={o._id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="font-medium text-ink">#{o._id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-ink-faint">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink">
                          ₦{Math.round(o.subtotal - orderCommission).toLocaleString()}
                        </p>
                        <p className="text-xs text-ink-faint">of ₦{o.subtotal.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
            </Card>
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