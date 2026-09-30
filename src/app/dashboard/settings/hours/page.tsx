"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface VendorHours {
  openTime?: string | null;
  closeTime?: string | null;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function OpeningHoursPage() {
  const { getToken } = useAuth();
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/me");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your store."));
      const data = (await res.json()) as { vendor: VendorHours };
      setOpenTime(data.vendor.openTime ?? "");
      setCloseTime(data.vendor.closeTime ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your store.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setError(null);
    setSaved(false);
    if (!TIME_RE.test(openTime) || !TIME_RE.test(closeTime)) {
      return setError("Please set both an opening and a closing time.");
    }
    setSaving(true);
    try {
      const res = await apiFetch(getToken, "/api/vendor/me", {
        method: "PATCH",
        body: JSON.stringify({ openTime, closeTime }),
      });
      if (!res.ok) {
        setError(await readError(res, "Couldn't save your hours."));
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your hours.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg space-y-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-ink outline-none";

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" aria-label="Back to settings" className="text-ink">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-ink">Opening Hours</h1>
      </div>

      <p className="text-sm text-ink-muted">
        Customers see these times on your store page. They are for information only. To stop taking orders, use the
        Store Status switch in Settings.
      </p>

      {error && <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-status-success-bg p-2 text-sm text-status-success">Your hours have been saved.</p>
      )}

      <Card className="space-y-4 p-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink-muted">Opens at</span>
          <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={field} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink-muted">Closes at</span>
          <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={field} />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-ink disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save hours"}
        </button>
      </Card>
    </div>
  );
}