"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Status = "active" | "scheduled" | "ended" | "stopped";

interface Promotion {
  _id: string;
  label: string;
  scope: "all" | "products";
  productCount: number;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  status: Status;
}

const STATUS_LABEL: Record<Status, string> = {
  active: "Running",
  scheduled: "Starts soon",
  ended: "Ended",
  stopped: "Stopped",
};

// Full class names so Tailwind always generates them.
const STATUS_BADGE: Record<Status, string> = {
  active: "bg-status-delivered-bg text-status-delivered",
  scheduled: "bg-status-preparing-bg text-status-preparing",
  ended: "bg-status-cancelled-bg text-status-cancelled",
  stopped: "bg-status-cancelled-bg text-status-cancelled",
};

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function PromotionsPage() {
  const { getToken } = useAuth();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/promotions");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your promotions."));
      const data = await res.json();
      setPromos(data.promotions ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your promotions.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (p: Promotion) => {
    setBusyId(p._id);
    setError(null);
    try {
      const res = await apiFetch(getToken, `/api/promotions/${p._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't update this promotion."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update this promotion.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Promotions</h1>

      <Link
        href="/dashboard/promotions/new"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink"
      >
        <Plus size={18} /> New promotion
      </Link>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="space-y-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : promos.length === 0 && !error ? (
        <Card className="p-5 text-center">
          <p className="text-sm text-ink-muted">
            No promotions yet. Tap New promotion to offer a discount and get more orders.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => {
            const canToggle = p.status !== "ended";
            return (
              <Card key={p._id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
                    <Tag size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-ink">{p.label}</p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      {p.scope === "all"
                        ? "Whole shop"
                        : `${p.productCount} item${p.productCount === 1 ? "" : "s"}`}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {p.endsAt ? `${dayOf(p.startsAt)} to ${dayOf(p.endsAt)}` : `From ${dayOf(p.startsAt)}, until you stop it`}
                    </p>
                  </div>
                </div>
                {canToggle && (
                  <button
                    onClick={() => toggle(p)}
                    disabled={busyId === p._id}
                    className={`mt-3 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 ${
                      p.isActive
                        ? "border border-status-danger bg-surface text-status-danger"
                        : "bg-brand text-brand-ink"
                    }`}
                  >
                    {p.isActive ? "Stop promotion" : "Start again"}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}