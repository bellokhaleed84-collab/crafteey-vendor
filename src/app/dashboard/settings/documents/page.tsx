"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/Skeleton";
import DocumentsPanel, { type DocsInfo } from "@/components/DocumentsPanel";

export default function BusinessDocumentsPage() {
  const { getToken } = useAuth();
  const [info, setInfo] = useState<DocsInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/documents");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your documents."));
      setInfo(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your documents.");
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Business Documents</span>
      </Link>

      <p className="text-sm text-ink-muted">
        Your CAC certificate and ID help us verify your store. Only our review team can see them.
      </p>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      {info ? (
        <DocumentsPanel documents={info.documents} onChanged={load} />
      ) : !error ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : null}
    </div>
  );
}