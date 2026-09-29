"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Order {
  _id: string;
  customerName: string;
  status: string;
  total: number;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_ACCENT: Record<string, string> = {
  pending: "new",
  accepted: "new",
  preparing: "preparing",
  ready_for_pickup: "ready",
  picked_up: "ready",
  delivered: "delivered",
  rejected: "cancelled",
  cancelled: "cancelled",
};

type FilterKey = "all" | "pending" | "preparing" | "ready_for_pickup";

const POLL_MS = 15000;

function orderNumber(id: string): string {
  return `#CRF${id.slice(-4).toUpperCase()}`;
}

function timeAgo(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function OrdersPage() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/orders");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load orders."));
      const data = await res.json();
      setOrders(data.orders ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load orders.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const newCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready_for_pickup").length;

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: orders.length },
    { key: "pending", label: "New", count: newCount },
    { key: "preparing", label: "Preparing", count: preparingCount },
    { key: "ready_for_pickup", label: "Ready", count: readyCount },
  ];

  const filtered = filter === "all" ? sorted : sorted.filter((o) => o.status === filter);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Orders</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? "bg-brand text-brand-ink"
                : "bg-surface-border text-ink-muted"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      {loading ? (
        <OrdersSkeleton />
      ) : filtered.length === 0 && !error ? (
        <p className="text-sm text-ink-muted">No orders here yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const accent = STATUS_ACCENT[o.status] || "new";
            const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <Link key={o._id} href={`/dashboard/orders/${o._id}`}>
                <Card className="p-4 transition hover:border-brand/40 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{orderNumber(o._id)}</p>
                      <p className="truncate text-sm text-ink-muted">{o.customerName}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full bg-status-${accent}-bg px-2.5 py-1 text-xs font-semibold text-status-${accent}`}
                    >
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      {itemCount} item{itemCount === 1 ? "" : "s"} • ₦{o.total.toLocaleString()}
                    </span>
                    <span className="text-xs text-ink-faint">{timeAgo(o.createdAt)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-2 flex justify-between">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        </Card>
      ))}
    </div>
  );
}