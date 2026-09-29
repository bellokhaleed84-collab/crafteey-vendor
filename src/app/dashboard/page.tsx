"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonStatCard, SkeletonText } from "@/components/ui/Skeleton";

interface VendorSummary {
  businessName: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  isOpen: boolean;
  isApproved: boolean;
}

interface OrderSummary {
  status: string;
  total: number;
  createdAt: string;
}

const COMMISSION_RATE = 0.15; // TODO: replace with the vendor's real tier rate

const STATUS_STYLES: Record<VendorSummary["status"], { label: string; bg: string; text: string }> = {
  pending: { label: "Pending review", bg: "bg-status-warning-bg", text: "text-status-warning" },
  approved: { label: "Approved", bg: "bg-status-success-bg", text: "text-status-success" },
  rejected: { label: "Rejected", bg: "bg-status-danger-bg", text: "text-status-danger" },
  suspended: { label: "Suspended", bg: "bg-status-danger-bg", text: "text-status-danger" },
};

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export default function DashboardOverviewPage() {
  const { getToken } = useAuth();
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [vendorRes, ordersRes] = await Promise.all([
        apiFetch(getToken, "/api/vendor/me"),
        apiFetch(getToken, "/api/orders"),
      ]);
      if (vendorRes.ok) {
        const data = await vendorRes.json();
        setVendor(data.vendor);

        // Best-effort: link this vendor into the client Hub if they're
        // approved and not linked yet. Safe to call repeatedly — the route
        // is a no-op once a HubVendor already exists for this uid.
        if (data.vendor?.status === "approved" && data.vendor?.isApproved) {
          apiFetch(getToken, "/api/vendor/hub-link", { method: "POST" }).catch(() => {});
        }
      }
      if (ordersRes.ok) setOrders((await ordersRes.json()).orders ?? []);
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
  const todaysOrders = orders.filter((o) => isSameDay(o.createdAt, today));
  const todaysSales = todaysOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);

  const newCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready_for_pickup").length;
  const completedCount = orders.filter((o) => o.status === "delivered").length;

  const deliveredTotal = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);
  const estBalance = deliveredTotal * (1 - COMMISSION_RATE);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const trend = days.map((d) => ({
    label: d.toLocaleDateString(undefined, { weekday: "short" }),
    value: orders
      .filter((o) => o.status === "delivered" && isSameDay(o.createdAt, d))
      .reduce((sum, o) => sum + o.total, 0),
  }));
  const maxTrend = Math.max(...trend.map((t) => t.value), 1);

  const statusStyle = vendor ? STATUS_STYLES[vendor.status] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-brand-ink">
            C
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-ink">Crafteey</p>
            <p className="text-[11px] leading-tight text-ink-muted">Vendor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface"
          >
            <Bell size={16} className="text-ink-muted" />
          </button>
          {vendor && (
            <div className="flex items-center gap-2 rounded-full border border-surface-border bg-surface py-1 pl-1 pr-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">
                {vendor.businessName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[90px] truncate text-xs font-medium text-ink">
                {vendor.businessName}
              </span>
            </div>
          )}
        </div>
      </div>

      <Card className="bg-brand p-4">
        <p className="text-sm font-semibold text-brand-ink">
          Good morning{vendor ? `, ${vendor.businessName.split(" ")[0]}` : ""}!
        </p>
        <p className="mt-0.5 text-xs text-brand-ink/70">
          Here&apos;s what&apos;s happening with your store today
        </p>
        {statusStyle && (
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
          >
            {statusStyle.label}
          </span>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total orders" value={orders.length} icon="🛒" />
        <StatCard label="Total sales (delivered)" value={`₦${deliveredTotal.toLocaleString()}`} icon="₦" />
        <StatCard label="Est. balance" value={`₦${Math.round(estBalance).toLocaleString()}`} icon="💳" />
        <StatCard label="Today's sales" value={`₦${todaysSales.toLocaleString()}`} icon="📈" />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Order status</h2>
          <Link href="/dashboard/orders" className="text-xs font-medium text-brand-dark">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatusPill label="New" value={newCount} accent="new" />
          <StatusPill label="Preparing" value={preparingCount} accent="preparing" />
          <StatusPill label="Ready" value={readyCount} accent="ready" />
          <StatusPill label="Completed" value={completedCount} accent="delivered" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Sales, last 7 days</h2>
          <TrendingUp size={16} className="text-status-success" />
        </div>
        <div className="flex h-24 items-end gap-2">
          {trend.map((t) => (
            <div key={t.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-brand"
                style={{ height: `${Math.max((t.value / maxTrend) * 100, 4)}%` }}
                title={`₦${t.value.toLocaleString()}`}
              />
              <span className="text-[10px] text-ink-faint">{t.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-surface-muted p-4">
        <p className="text-sm font-semibold text-ink">Crafteey Update</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Vendor announcements will appear here once that feature is built.
        </p>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-sm">
          {icon}
        </span>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold text-ink">{value}</p>
    </Card>
  );
}

function StatusPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "new" | "preparing" | "ready" | "delivered";
}) {
  return (
    <div className={`rounded-xl bg-status-${accent}-bg p-2.5 text-center`}>
      <p className={`text-base font-bold text-status-${accent}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-ink-muted">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}