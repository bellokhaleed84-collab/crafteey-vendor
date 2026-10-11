"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLE } from "@/lib/supportTicketLabels";

type Row = {
  id: string;
  category: string;
  subject: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadClient: number;
};

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(
    new Date(iso)
  );
}

export default function VendorTicketsPage() {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(getToken, "/api/vendor/support/tickets");
        if (cancelled) return;
        if (!res.ok) {
          setError(await readError(res, "Couldn't load your reports."));
          setRows([]);
          return;
        }
        const data = await res.json();
        setRows(Array.isArray(data.tickets) ? data.tickets : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load your reports.");
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div className="max-w-lg space-y-4">
      <Link href="/dashboard/more/help" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">My support chats</span>
      </Link>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      {rows === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {rows && rows.length === 0 && !error && (
        <Card className="p-6 text-center">
          <p className="text-sm font-semibold text-ink">No reports yet</p>
          <p className="mt-1 text-xs text-ink-muted">If something goes wrong, tell us and we will help.</p>
        </Card>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/more/help/tickets/${r.id}`}
              className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      STATUS_STYLE[r.status] || STATUS_STYLE.open
                    }`}
                  >
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  <span className="truncate text-xs text-ink-muted">{CATEGORY_LABELS[r.category] || r.category}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-ink">{r.subject}</p>
                <p className="truncate text-xs text-ink-muted">{r.lastMessage}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-ink-faint">{dayLabel(r.lastMessageAt)}</span>
                {r.unreadClient > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-ink">
                    {r.unreadClient}
                  </span>
                ) : (
                  <ChevronRight size={16} className="text-ink-faint" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/more/help/report"
        className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink"
      >
        <Plus size={18} />
        New report
      </Link>
    </div>
  );
}