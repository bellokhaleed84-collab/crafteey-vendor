"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, Settings2, Users } from "lucide-react";
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

interface ChartDay {
  day: string;
  payoutKobo: number;
  count: number;
}

interface TxRow {
  id: string;
  kind: "order" | "payout";
  label: string;
  amountKobo: number;
  date: string;
  status: string;
}

interface WalletLite {
  availableKobo: number;
  history: TxRow[];
}

type TabKey = "overview" | "history" | "transactions";
type Range = 7 | 30 | 90;

// Amounts come from the server in kobo.
function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`;
}

function payoutLabel(status: string): { text: string; cls: string } {
  if (status === "paid") return { text: "Paid", cls: "text-status-success" };
  if (status === "failed") return { text: "Failed", cls: "text-status-danger" };
  return { text: "Processing", cls: "text-ink-muted" };
}

function SalesChart({ days }: { days: ChartDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.payoutKobo));
  const total = days.reduce((s, d) => s + d.payoutKobo, 0);
  return (
    <div>
      <p className="text-xs text-ink-muted">Earned in this period</p>
      <p className="mt-1 text-xl font-bold text-ink">{naira(total)}</p>
      <div className="mt-4 flex h-32 items-end gap-px">
        {days.map((d) => (
          <div key={d.day} className="flex h-full flex-1 items-end" title={`${shortDay(d.day)}: ${naira(d.payoutKobo)}`}>
            <div
              className={`w-full rounded-t ${d.payoutKobo > 0 ? "bg-brand" : "bg-surface-border"}`}
              style={{ height: d.payoutKobo > 0 ? `${Math.max(4, (d.payoutKobo / max) * 100)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
        <span>{days.length > 0 ? shortDay(days[0].day) : ""}</span>
        <span>{days.length > 0 ? shortDay(days[days.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

export default function EarningsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [chart, setChart] = useState<ChartDay[] | null>(null);
  const [chartFailed, setChartFailed] = useState(false);
  const [wallet, setWallet] = useState<WalletLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<Range>(7);

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

  // The chart and wallet are extras. If they fail, the rest of the page still works.
  const loadExtras = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/earnings/chart");
      if (res.ok) setChart((await res.json()).days ?? []);
      else setChartFailed(true);
    } catch {
      setChartFailed(true);
    }
    try {
      const res = await apiFetch(getToken, "/api/vendor/wallet");
      if (res.ok) setWallet(await res.json());
    } catch {
      /* the Withdraw card just hides the balance */
    }
  }, [getToken]);

  useEffect(() => {
    load();
    loadExtras();
  }, [load, loadExtras]);

  if (loading) return <EarningsSkeleton />;

  if (!data) {
    return (
      <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
        {error ?? "Couldn't load your earnings."}
      </p>
    );
  }

  const { totals, history, tier } = data;
  const tierInfo = isVendorTier(tier) ? TIER_INFO[tier] : null;
  const shownDays = chart ? chart.slice(chart.length - range) : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Earnings</h1>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      <Card className="p-5">
        <p className="text-xs text-ink-muted">Total Earnings</p>
        <p className="mt-1 text-3xl font-bold text-ink">{naira(totals.earnedPayoutKobo)}</p>
        <p className="mt-1 text-xs text-ink-faint">
          From {totals.earnedCount} delivered order{totals.earnedCount === 1 ? "" : "s"}
        </p>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">Available to withdraw</p>
          {wallet ? (
            <p className="mt-0.5 text-xl font-bold text-ink">{naira(wallet.availableKobo)}</p>
          ) : (
            <Skeleton className="mt-1 h-6 w-24" />
          )}
        </div>
        <Link
          href="/dashboard/wallet"
          className="shrink-0 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-ink"
        >
          Withdraw
        </Link>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Sales</h2>
          <div className="flex gap-1.5">
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  range === r
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-surface-border bg-white text-ink-muted"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        {shownDays ? (
          <SalesChart days={shownDays} />
        ) : chartFailed ? (
          <p className="text-sm text-ink-muted">Couldn&apos;t load the chart.</p>
        ) : (
          <Skeleton className="h-44 rounded-xl" />
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Completed Orders</p>
          <p className="mt-1 text-xl font-bold text-ink">{totals.earnedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Pending Payout</p>
          <p className="mt-1 text-xl font-bold text-ink">{naira(totals.pendingPayoutKobo)}</p>
          <p className="text-xs text-ink-faint">
            {totals.pendingCount} order{totals.pendingCount === 1 ? "" : "s"} in progress
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Item sales</p>
          <p className="mt-1 text-lg font-bold text-ink">{naira(totals.earnedSalesKobo)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Crafteey commission</p>
          <p className="mt-1 text-lg font-bold text-ink">
            {"\u2212"}
            {naira(totals.earnedCommissionKobo)}
          </p>
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

      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/analytics">
          <Card className="flex h-full flex-col gap-2 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <BarChart3 size={18} />
            </span>
            <p className="font-semibold text-ink">Analytics</p>
            <p className="text-xs text-ink-muted">Top items and promotions</p>
          </Card>
        </Link>
        <Link href="/dashboard/customers">
          <Card className="flex h-full flex-col gap-2 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Users size={18} />
            </span>
            <p className="font-semibold text-ink">Customers</p>
            <p className="text-xs text-ink-muted">Who orders from you</p>
          </Card>
        </Link>
      </div>

      <Link href="/dashboard/earnings/payout-settings">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
            <Settings2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Payout settings</p>
            <p className="text-xs text-ink-muted">Bank account and withdrawal rules</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-faint" />
        </Card>
      </Link>

      <div className="flex flex-wrap gap-2">
        {(["overview", "history", "transactions"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              tab === t
                ? "border-brand bg-brand text-brand-ink"
                : "border-surface-border bg-white text-ink-muted"
            }`}
          >
            {t === "overview" ? "Overview" : t === "history" ? "Earnings History" : "Transactions"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
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
        </Card>
      )}

      {tab === "history" && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-ink">Delivered orders</h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-muted">No delivered orders yet.</p>
          ) : (
            <>
              <Card className="divide-y divide-surface-border">
                {history.map((o) => (
                  <div key={o._id} className="flex items-center justify-between p-3.5 text-sm">
                    <div>
                      <p className="font-semibold text-ink">
                        #{o.orderNumber ?? o._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {new Date(o.deliveredAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-status-success">+{naira(o.payoutKobo)}</p>
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

      {tab === "transactions" && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-ink">Orders and withdrawals</h2>
          {!wallet ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : wallet.history.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing here yet.</p>
          ) : (
            <Card className="divide-y divide-surface-border">
              {wallet.history.map((h) => {
                const isPayout = h.kind === "payout";
                const st = isPayout ? payoutLabel(h.status) : null;
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{h.label}</p>
                      <p className="text-xs text-ink-faint">
                        {new Date(h.date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}
                        {st && (
                          <>
                            {" \u2022 "}
                            <span className={st.cls}>{st.text}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <p className={`shrink-0 font-bold ${isPayout ? "text-ink" : "text-status-success"}`}>
                      {isPayout ? "\u2212" : "+"}
                      {naira(h.amountKobo)}
                    </p>
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
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
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