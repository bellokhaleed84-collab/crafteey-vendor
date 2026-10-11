"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Landmark, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface WalletLite {
  hasBankAccount: boolean;
  bank: { accountName: string; bankName: string; last4: string } | null;
  rules: { daysLabel: string; minPayoutKobo: number };
}

function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export default function PayoutSettingsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<WalletLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/wallet");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your payout settings."));
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your payout settings.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <Link href="/dashboard/earnings" className="inline-flex items-center gap-2 text-ink">
      <ChevronLeft size={22} />
      <span className="text-lg font-bold">Payout Settings</span>
    </Link>
  );

  if (loading) {
    return (
      <div className="max-w-lg space-y-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-lg space-y-5">
        {header}
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
          {error ?? "Couldn't load your payout settings."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      {header}

      <Link href="/dashboard/settings/bank-account">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
            <Landmark size={18} />
          </span>
          <div className="min-w-0 flex-1">
            {data.hasBankAccount && data.bank ? (
              <>
                <p className="truncate font-semibold text-ink">{data.bank.accountName}</p>
                <p className="text-xs text-ink-muted">
                  {data.bank.bankName} {"\u2022"} {"\u2022\u2022\u2022\u2022"}
                  {data.bank.last4}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-ink">Add a bank account</p>
                <p className="text-xs text-ink-muted">Needed before you can withdraw</p>
              </>
            )}
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-faint" />
        </Card>
      </Link>

      <Card className="divide-y divide-surface-border">
        <div className="flex items-center justify-between p-4 text-sm">
          <span className="text-ink-muted">Withdrawal days</span>
          <span className="font-semibold capitalize text-ink">{data.rules.daysLabel}</span>
        </div>
        <div className="flex items-center justify-between p-4 text-sm">
          <span className="text-ink-muted">Limit</span>
          <span className="font-semibold text-ink">Once a day</span>
        </div>
        <div className="flex items-center justify-between p-4 text-sm">
          <span className="text-ink-muted">Minimum withdrawal</span>
          <span className="font-semibold text-ink">{naira(data.rules.minPayoutKobo)}</span>
        </div>
        <div className="flex items-center justify-between p-4 text-sm">
          <span className="text-ink-muted">Amount</span>
          <span className="font-semibold text-ink">You choose</span>
        </div>
      </Card>

      <p className="text-xs text-ink-faint">
        These rules are set by Crafteey. You can change your bank account at any time, unless a
        withdrawal is being processed.
      </p>
    </div>
  );
}