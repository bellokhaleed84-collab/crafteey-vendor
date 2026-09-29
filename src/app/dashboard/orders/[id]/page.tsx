"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  _id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  note?: string;
  status: string;
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

const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  pending: [
    { label: "Accept order", status: "accepted" },
    { label: "Reject order", status: "rejected" },
  ],
  accepted: [{ label: "Start preparing", status: "preparing" }],
  preparing: [{ label: "Mark ready for pickup", status: "ready_for_pickup" }],
};

// Visual progress trail. Only shown when the order hasn't been
// rejected/cancelled, since those are dead-end states, not a step on the
// normal path.
const TRAIL = [
  { status: "pending", label: "Order placed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready_for_pickup", label: "Ready for pickup" },
  { status: "delivered", label: "Delivered" },
];

const POLL_MS = 15000;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/orders");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load this order."));
      const data = await res.json();
      const found = ((data.orders ?? []) as Order[]).find((o) => o._id === id);
      setOrder(found ?? null);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load this order.");
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const updateStatus = async (status: string) => {
    if (status === "rejected" && !confirm("Reject this order? This can't be undone.")) {
      return;
    }
    setUpdating(true);
    setActionError(null);
    try {
      const res = await apiFetch(getToken, `/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't update this order."));
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update this order.");
    } finally {
      setUpdating(false);
    }
  };

  const back = (
    <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-ink-muted">
      <ChevronLeft size={16} /> Back to orders
    </Link>
  );

  if (loading) return <OrderDetailSkeleton back={back} />;

  if (!order) {
    return (
      <div className="max-w-lg space-y-4">
        {back}
        {loadError ? (
          <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
            {loadError}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">Order not found.</p>
        )}
      </div>
    );
  }

  const actions = NEXT_ACTIONS[order.status] || [];
  const isDeadEnd = order.status === "rejected" || order.status === "cancelled";
  const trailIndex = TRAIL.findIndex((t) => t.status === order.status);

  return (
    <div className="max-w-lg space-y-5">
      {back}

      {loadError && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
          {loadError}
        </p>
      )}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-ink">{order.customerName}</h1>
            <p className="text-sm text-ink-muted">{order.deliveryAddress}</p>
            <a href={`tel:${order.customerPhone}`} className="text-sm text-brand-dark">
              {order.customerPhone}
            </a>
          </div>
          <span className="shrink-0 rounded-full bg-status-new-bg px-2.5 py-1 text-xs font-semibold text-status-new">
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
      </Card>

      {!isDeadEnd && (
        <Card className="p-4">
          <ol className="space-y-3">
            {TRAIL.map((step, i) => {
              const done = i < trailIndex;
              const current = i === trailIndex;
              return (
                <li key={step.status} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-status-success text-white"
                        : current
                          ? "bg-brand text-brand-ink"
                          : "bg-surface-border text-ink-faint"
                    }`}
                  >
                    {done ? <Check size={14} /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </span>
                  <span className={`text-sm ${current ? "font-semibold text-ink" : "text-ink-muted"}`}>
                    {step.label}
                  </span>
                  {!done && !current && (
                    <span className="ml-auto text-xs text-ink-faint">Pending</span>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <Card className="divide-y divide-surface-border">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between p-3 text-sm">
            <span className="text-ink">
              {item.quantity}x {item.name}
            </span>
            <span className="text-ink">₦{(item.unitPrice * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 text-sm text-ink-muted">
          <span>Delivery fee</span>
          <span>₦{order.deliveryFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between p-3 font-semibold text-ink">
          <span>Total</span>
          <span>₦{order.total.toLocaleString()}</span>
        </div>
      </Card>

      {order.note && (
        <Card className="bg-surface-muted p-3 text-sm text-ink">
          <span className="font-medium">Note: </span>
          {order.note}
        </Card>
      )}

      {actionError && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
          {actionError}
        </p>
      )}

      {actions.length > 0 && (
        <div className="flex gap-3">
          {actions.map((a) => (
            <button
              key={a.status}
              onClick={() => updateStatus(a.status)}
              disabled={updating}
              className={`flex-1 rounded-xl py-3 font-semibold transition disabled:opacity-60 ${
                a.status === "rejected"
                  ? "border border-status-danger text-status-danger"
                  : "bg-brand text-brand-ink"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {order.status === "ready_for_pickup" && (
        <Card className="bg-surface-muted p-3 text-sm text-ink-muted">
          Waiting for the rider to collect this order.
        </Card>
      )}
    </div>
  );
}

function OrderDetailSkeleton({ back }: { back: React.ReactNode }) {
  return (
    <div className="max-w-lg space-y-5">
      {back}
      <Card className="p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3.5 w-56" />
        <Skeleton className="mt-2 h-3.5 w-32" />
      </Card>
      <Card className="space-y-3 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </Card>
      <Card className="p-4">
        <Skeleton className="h-10 w-full" />
      </Card>
    </div>
  );
}