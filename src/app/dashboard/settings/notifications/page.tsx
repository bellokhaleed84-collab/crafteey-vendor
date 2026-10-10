"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Key = "newOrders" | "promotions" | "system";
type Prefs = Record<Key, boolean>;

const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: "newOrders", label: "New orders", hint: "Alert me when a customer places an order" },
  { key: "promotions", label: "Promotions", hint: "Tips and offers to grow my sales" },
  { key: "system", label: "System messages", hint: "Account, approval and Crafteey updates" },
];

export default function NotificationSettingsPage() {
  const { getToken } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<Key | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/notification-settings");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your settings."));
      const data = await res.json();
      setPrefs(data.prefs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your settings.");
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (key: Key) => {
    if (!prefs || busyKey) return;
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    setBusyKey(key);
    setError(null);
    try {
      const res = await apiFetch(getToken, "/api/vendor/notification-settings", {
        method: "POST",
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't save that change."));
      const data = await res.json();
      setPrefs(data.prefs);
    } catch (err) {
      setPrefs((p) => (p ? { ...p, [key]: !next } : p));
      setError(err instanceof Error ? err.message : "Couldn't save that change.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Notification Settings</span>
      </Link>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      {prefs === null && !error ? (
        <Card className="space-y-4 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : (
        prefs && (
          <Card className="divide-y divide-surface-border">
            {ROWS.map((r) => (
              <div key={r.key} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{r.label}</p>
                  <p className="text-xs text-ink-muted">{r.hint}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[r.key]}
                  aria-label={r.label}
                  onClick={() => toggle(r.key)}
                  disabled={busyKey !== null}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${
                    prefs[r.key] ? "bg-brand" : "bg-surface-border"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                      prefs[r.key] ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </Card>
        )
      )}
    </div>
  );
}