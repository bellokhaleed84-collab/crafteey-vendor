"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Range = 7 | 30 | 90;

interface Analytics {
  days: { day: string; salesKobo: number; count: number }[];
  totals: { salesKobo: number; orders: number; discountKobo: number };
  topItems: { name: string; quantity: number; salesKobo: number }[];
  promos: { label: string; orders: number; discountKobo: number }[];
}

function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`;
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (r: Range) => {
      setLoading(true);
      try {
        const res = await apiFetch(getToken, `/api/analytics?days=${r}`);
        if (!res.ok) throw new Error(await readError(res, "Couldn't load your reports."));
        setData(await res.json());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your reports.");
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  const header = (
    <Link href="/dashboard/earnings" className="inline-flex items-center gap-2 text-ink">
      <ChevronLeft size={22} />
      <span className="text-lg font-bold">Analytics</span>
    </Link>
  );

  const maxSales = data ? Math.max(1, ...data.days.map((d) => d.salesKobo)) : 1;
  const maxQty = data ? Math.max(1, ...data.topItems.map((t) => t.quantity)) : 1;
  const avg = data && data.totals.orders > 0 ? Math.round(data.totals.salesKobo / data.totals.orders) : 0;

  return (
    <div className="max-w-lg space-y-5">
      {header}

      <div className="flex gap-1.5">
        {([7, 30, 90] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${
              range === r
                ? "border-brand bg-brand text-brand-ink"
                : "border-surface-border bg-white text-ink-muted"
            }`}
          >
            {r} days
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : data ? (
        <div className={`space-y-5 ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Item sales</p>
              <p className="mt-1 text-lg font-bold text-ink">{naira(data.totals.salesKobo)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Delivered orders</p>
              <p className="mt-1 text-lg font-bold text-ink">{data.totals.orders}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Average order</p>
              <p className="mt-1 text-lg font-bold text-ink">{naira(avg)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Promotions cost you</p>
              <p className="mt-1 text-lg font-bold text-ink">{naira(data.totals.discountKobo)}</p>
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold text-ink">Sales per day</h2>
            <div className="flex h-32 items-end gap-px">
              {data.days.map((d) => (
                <div
                  key={d.day}
                  className="flex h-full flex-1 items-end"
                  title={`${shortDay(d.day)}: ${naira(d.salesKobo)} (${d.count} orders)`}
                >
                  <div
                    className={`w-full rounded-t ${d.salesKobo > 0 ? "bg-brand" : "bg-surface-border"}`}
                    style={{ height: d.salesKobo > 0 ? `${Math.max(4, (d.salesKobo / maxSales) * 100)}%` : "2px" }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
              <span>{data.days.length > 0 ? shortDay(data.days[0].day) : ""}</span>
              <span>{data.days.length > 0 ? shortDay(data.days[data.days.length - 1].day) : ""}</span>
            </div>
          </Card>

          <div>
            <h2 className="mb-2 text-sm font-bold text-ink">Top items</h2>
            {data.topItems.length === 0 ? (
              <p className="text-sm text-ink-muted">No delivered orders in this period yet.</p>
            ) : (
              <Card className="divide-y divide-surface-border">
                {data.topItems.map((t, i) => (
                  <div key={t.name} className="p-3.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-semibold text-ink">
                        {i + 1}. {t.name}
                      </p>
                      <p className="shrink-0 text-xs text-ink-muted">
                        {t.quantity} sold {"\u2022"} {naira(t.salesKobo)}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-border">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(t.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold text-ink">Promotion report</h2>
            {data.promos.length === 0 ? (
              <p className="text-sm text-ink-muted">No promotion was used on a delivered order in this period.</p>
            ) : (
              <Card className="divide-y divide-surface-border">
                {data.promos.map((p) => (
                  <div key={p.label} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{p.label}</p>
                      <p className="text-xs text-ink-faint">
                        Used on {p.orders} order{p.orders === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-ink">
                      {"\u2212"}
                      {naira(p.discountKobo)}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </div>

          <Link
            href="/dashboard/customers"
            className="block rounded-xl border border-brand py-3 text-center text-sm font-bold text-brand-dark"
          >
            See your customers
          </Link>
        </div>
      ) : null}
    </div>
  );
}