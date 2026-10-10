"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonStatCard } from "@/components/ui/Skeleton";

interface VendorSummary {
  businessName: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  isOpen: boolean;
  isApproved: boolean;
}

interface OrderOption {
  choiceName: string;
  quantity: number;
}

interface OrderSummary {
  _id: string;
  orderNumber: string;
  stage: "new" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
  items: { name: string; quantity: number; options?: OrderOption[] }[];
  subtotal: number;
  vendorPayout: number;
  placedAt: string;
}

const STAGE_LABELS: Record<OrderSummary["stage"], string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Full class names so Tailwind always generates them.
const STAGE_BADGE: Record<OrderSummary["stage"], string> = {
  new: "bg-status-new-bg text-status-new",
  preparing: "bg-status-preparing-bg text-status-preparing",
  ready: "bg-status-ready-bg text-status-ready",
  picked_up: "bg-status-ready-bg text-status-ready",
  delivered: "bg-status-delivered-bg text-status-delivered",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function DashboardOverviewPage() {
  const { getToken } = useAuth();
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [vendorRes, ordersRes, productsRes] = await Promise.all([
        apiFetch(getToken, "/api/vendor/me"),
        apiFetch(getToken, "/api/orders"),
        apiFetch(getToken, "/api/products"),
      ]);
      if (vendorRes.ok) {
        const data = await vendorRes.json();
        setVendor(data.vendor);

        // Best-effort: link this vendor into the client Hub if they're
        // approved and not linked yet. Safe to call repeatedly: the route
        // is a no-op once a HubVendor already exists for this uid.
        if (data.vendor?.status === "approved" && data.vendor?.isApproved) {
          apiFetch(getToken, "/api/vendor/hub-link", { method: "POST" }).catch(() => {});
        }
      }
      if (ordersRes.ok) setOrders((await ordersRes.json()).orders ?? []);
      if (productsRes.ok) setProductCount(((await productsRes.json()).products ?? []).length);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (loadError) {
    return (
      <Card className="p-5">
        <p className="text-sm text-status-danger">{loadError}</p>
      </Card>
    );
  }

  const today = new Date();
  const todaysSales = orders
    .filter((o) => o.stage === "delivered" && isSameDay(o.placedAt, today))
    .reduce((sum, o) => sum + o.subtotal, 0);
  const pendingCount = orders.filter((o) => o.stage === "new").length;
  const recent = orders.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-ink">{greeting()}</p>
          <p className="flex items-center gap-1.5 text-lg font-bold leading-tight text-ink">
            <span className="truncate">{vendor?.businessName ?? "Your store"}</span>
            {vendor?.isApproved && <BadgeCheck size={18} className="shrink-0 text-status-info" />}
          </p>
          {vendor?.isApproved && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-status-success">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
              Verified Vendor
            </p>
          )}
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-base font-bold text-brand-dark">
          {(vendor?.businessName ?? "C").charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Orders" value={String(orders.length)} />
        <StatCard label="Today's Sales" value={`\u20A6${todaysSales.toLocaleString()}`} />
        <StatCard label="Pending Orders" value={String(pendingCount)} />
        <StatCard label="Total Products" value={String(productCount)} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-xs font-semibold text-brand-dark">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-ink-muted">No orders yet. New orders will show up here.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-surface-border">
            {recent.map((o) => (
              <Link
                key={o._id}
                href={`/dashboard/orders/${o._id}`}
                className="flex items-center gap-3 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{o.orderNumber}</p>
                  <p className="text-xs text-ink-muted">
                    {"\u20A6"}
                    {o.subtotal.toLocaleString()} {"\u2022"} {timeOf(o.placedAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STAGE_BADGE[o.stage]}`}
                >
                  {STAGE_LABELS[o.stage]}
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}