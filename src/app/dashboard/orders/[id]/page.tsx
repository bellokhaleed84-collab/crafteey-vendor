"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreAccess } from "@/contexts/StoreRoleContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Stage = "new" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";

interface OrderOption {
  groupName: string;
  choiceName: string;
  /** per plate */
  quantity: number;
  imageUrl?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  stage: Stage;
  items: { name: string; quantity: number; unitPrice: number; options?: OrderOption[] }[];
  subtotal: number;
  /** Not sent to staff. */
  vendorPayout?: number;
  placedAt: string;
}

const STAGE_LABELS: Record<Stage, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STAGE_BADGE: Record<Stage, string> = {
  new: "bg-status-new-bg text-status-new",
  preparing: "bg-status-preparing-bg text-status-preparing",
  ready: "bg-status-ready-bg text-status-ready",
  picked_up: "bg-status-ready-bg text-status-ready",
  delivered: "bg-status-delivered-bg text-status-delivered",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};

type Action = "accept" | "ready" | "reject";

const ACTIONS: Partial<Record<Stage, { label: string; action: Action }[]>> = {
  new: [
    { label: "Accept order", action: "accept" },
    { label: "Reject order", action: "reject" },
  ],
  preparing: [{ label: "Mark ready for pickup", action: "ready" }],
};

const TRAIL: { stage: Stage; label: string }[] = [
  { stage: "new", label: "Order received" },
  { stage: "preparing", label: "Preparing" },
  { stage: "ready", label: "Ready for pickup" },
  { stage: "picked_up", label: "Picked up by rider" },
  { stage: "delivered", label: "Delivered" },
];

const POLL_MS = 15000;

// Group the picked options by their group name, e.g. Portion / Extras.
function groupOptions(options: OrderOption[]) {
  const groups: { name: string; items: OrderOption[] }[] = [];
  for (const o of options) {
    const found = groups.find((g) => g.name === o.groupName);
    if (found) found.items.push(o);
    else groups.push({ name: o.groupName, items: [o] });
  }
  return groups;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { role } = useStoreAccess();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, `/api/orders/${id}`);
      if (res.status === 404) {
        setOrder(null);
        setLoadError(null);
        return;
      }
      if (!res.ok) throw new Error(await readError(res, "Couldn't load this order."));
      const data = await res.json();
      setOrder(data.order);
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

  const runAction = async (action: Action) => {
    if (action === "reject" && !confirm("Reject this order? This can't be undone.")) return;
    setUpdating(true);
    setActionError(null);
    try {
      const res = await apiFetch(getToken, `/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't update this order."));
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update this order.");
      await load();
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
          <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{loadError}</p>
        ) : (
          <p className="text-sm text-ink-muted">Order not found.</p>
        )}
      </div>
    );
  }

  const actions = ACTIONS[order.stage] ?? [];
  const cancelled = order.stage === "cancelled";
  const trailIndex = TRAIL.findIndex((t) => t.stage === order.stage);

  return (
    <div className="max-w-lg space-y-5">
      {back}

      {loadError && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{loadError}</p>
      )}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-ink">{order.orderNumber}</h1>
            <p className="text-sm text-ink-muted">
              Placed{" "}
              {new Date(order.placedAt).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_BADGE[order.stage]}`}>
            {STAGE_LABELS[order.stage]}
          </span>
        </div>
      </Card>

      {cancelled ? (
        <Card className="bg-surface-muted p-3 text-sm text-ink-muted">This order was cancelled.</Card>
      ) : (
        <Card className="p-4">
          <ol className="space-y-3">
            {TRAIL.map((step, i) => {
              const done = i < trailIndex || order.stage === "delivered";
              const current = i === trailIndex && order.stage !== "delivered";
              return (
                <li key={step.stage} className="flex items-center gap-3">
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
                  {!done && !current && <span className="ml-auto text-xs text-ink-faint">Pending</span>}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <Card className="divide-y divide-surface-border">
        {order.items.map((item, idx) => {
          const groups = groupOptions(item.options ?? []);
          return (
            <div key={idx} className="p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-ink">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-ink">
                  {"\u20A6"}
                  {(item.unitPrice * item.quantity).toLocaleString()}
                </span>
              </div>

              {groups.length > 0 && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-surface-muted p-2.5">
                  {item.quantity > 1 && (
                    <p className="text-xs font-semibold text-ink">Each plate:</p>
                  )}
                  {groups.map((g) => (
                    <div key={g.name} className="text-ink-muted">
                      <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                        {g.name}
                      </span>
                      <div className="mt-0.5 space-y-1">
                        {g.items.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            {o.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={o.imageUrl}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-md object-cover"
                              />
                            ) : null}
                            <span className="text-ink">
                              {o.quantity > 1 ? `${o.quantity} \u00D7 ` : ""}
                              {o.choiceName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-between p-3 text-sm text-ink-muted">
          <span>Items subtotal</span>
          <span>
            {"\u20A6"}
            {order.subtotal.toLocaleString()}
          </span>
        </div>
        {!cancelled && role === "owner" && order.vendorPayout !== undefined && (
          <div className="flex justify-between p-3 font-semibold text-ink">
            <span>Your payout</span>
            <span>
              {"\u20A6"}
              {order.vendorPayout.toLocaleString()}
            </span>
          </div>
        )}
      </Card>

      {actionError && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{actionError}</p>
      )}

      {actions.length > 0 && (
        <div className="flex gap-3">
          {actions.map((a) => (
            <button
              key={a.action}
              onClick={() => runAction(a.action)}
              disabled={updating}
              className={`flex-1 rounded-xl py-3 font-semibold transition disabled:opacity-60 ${
                a.action === "reject"
                  ? "border border-status-danger text-status-danger"
                  : "bg-brand text-brand-ink"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {order.stage === "ready" && (
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