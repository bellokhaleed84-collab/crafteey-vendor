"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { ORDERS_REFRESH_EVENT } from "@/components/PushRegistrar";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Order {
  _id: string;
  orderNumber: string;
  stage: "new" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
  items: { name: string; quantity: number }[];
  subtotal: number;
  vendorPayout: number;
  placedAt: string;
}

const STAGE_LABELS: Record<Order["stage"], string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Full class names so Tailwind always generates them.
const STAGE_BADGE: Record<Order["stage"], string> = {
  new: "bg-status-new-bg text-status-new",
  preparing: "bg-status-preparing-bg text-status-preparing",
  ready: "bg-status-ready-bg text-status-ready",
  picked_up: "bg-status-ready-bg text-status-ready",
  delivered: "bg-status-delivered-bg text-status-delivered",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};

type FilterKey = "all" | "new" | "preparing" | "ready";

const POLL_MS = 15000;

function timeOf(iso: string): string {
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
    // A push arrived while the app is open: refresh immediately
    window.addEventListener(ORDERS_REFRESH_EVENT, load);
    return () => {
      clearInterval(id);
      window.removeEventListener(ORDERS_REFRESH_EVENT, load);
    };
  }, [load]);

  const count = (stage: Order["stage"]) => orders.filter((o) => o.stage === stage).length;

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: orders.length },
    { key: "new", label: "New", count: count("new") },
    { key: "preparing", label: "Preparing", count: count("preparing") },
    { key: "ready", label: "Ready", count: count("ready") },
  ];

  const filtered = filter === "all" ? orders : orders.filter((o) => o.stage === filter);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Orders</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.key ? "bg-brand text-brand-ink" : "bg-surface-border text-ink-muted"
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
            const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
            const summary = o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ");
            return (
              <Link key={o._id} href={`/dashboard/orders/${o._id}`}>
                <Card className="p-4 transition hover:border-brand/40 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{o.orderNumber}</p>
                      <p className="truncate text-sm text-ink-muted">{summary}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_BADGE[o.stage]}`}
                    >
                      {STAGE_LABELS[o.stage]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      {itemCount} item{itemCount === 1 ? "" : "s"} • ₦{o.subtotal.toLocaleString()}
                    </span>
                    <span className="text-xs text-ink-faint">{timeOf(o.placedAt)}</span>
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