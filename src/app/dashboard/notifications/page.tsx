"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Item {
  id: string;
  type: "orders" | "promotions" | "system";
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

type Tab = "all" | "orders" | "promotions" | "system";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "orders", label: "Orders" },
  { key: "promotions", label: "Promotions" },
  { key: "system", label: "System" },
];

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", month: "short", day: "numeric" });
}

export default function VendorNotificationsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/notifications");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your notifications."));
      const data = await res.json();
      setItems(data.notifications ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your notifications.");
      setItems((prev) => prev ?? []);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    try {
      await apiFetch(getToken, "/api/vendor/notifications", { method: "POST" });
    } catch {
      /* the next refresh shows the real state */
    }
  };

  const unread = items?.filter((n) => !n.read).length ?? 0;
  const shown = items ? (tab === "all" ? items : items.filter((n) => n.type === tab)) : null;

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-ink">
          <ChevronLeft size={22} />
          <span className="text-lg font-bold">Notifications</span>
        </Link>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-border px-3 py-2 text-xs font-semibold text-brand-dark"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
              tab === t.key
                ? "border-brand bg-brand text-brand-ink"
                : "border-surface-border bg-surface text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {shown === null ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
            <Bell size={22} />
          </span>
          <p className="font-semibold text-ink">No notifications here</p>
          <p className="text-xs text-ink-muted">Order updates and messages from Crafteey show up here.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => n.link && router.push(n.link)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                n.read ? "border-surface-border bg-surface" : "border-brand bg-brand-light"
              }`}
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-status-danger"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-ink-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-ink-faint">{ago(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}