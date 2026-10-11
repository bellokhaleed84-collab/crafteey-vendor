"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Landmark, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface HistoryRow {
  id: string;
  kind: "order" | "payout";
  label: string;
  amountKobo: number;
  date: string;
  status: string;
}

interface WalletData {
  availableKobo: number;
  pendingKobo: number;
  paidOutKobo: number;
  processingKobo: number;
  withdrawnToday: boolean;
  hasBankAccount: boolean;
  bank: { accountName: string; bankName: string; last4: string } | null;
  rules: { daysLabel: string; isWithdrawalDay: boolean; nextDay: string; minPayoutKobo: number };
  history: HistoryRow[];
}

function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function payoutLabel(status: string): { text: string; cls: string } {
  if (status === "paid") return { text: "Paid", cls: "text-status-success" };
  if (status === "failed") return { text: "Failed", cls: "text-status-danger" };
  return { text: "Processing", cls: "text-ink-muted" };
}

// Why the Withdraw button can't be used right now, or null if it can.
function blockedReason(d: WalletData): string | null {
  if (!d.hasBankAccount) return "Add a bank account to withdraw.";
  if (d.processingKobo > 0) return "A withdrawal is being processed.";
  if (!d.rules.isWithdrawalDay) return `Withdrawals open on ${d.rules.nextDay}.`;
  if (d.withdrawnToday) return "You already withdrew today.";
  if (d.availableKobo < d.rules.minPayoutKobo) return `Minimum withdrawal is ${naira(d.rules.minPayoutKobo)}.`;
  return null;
}

export default function WalletPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/wallet");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your wallet."));
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your wallet.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(getToken, "/api/vendor/wallet/withdraw", { method: "POST" });
      if (!res.ok) {
        setError(await readError(res, "The withdrawal could not be sent."));
      } else {
        const out = await res.json();
        setNotice(
          out.status === "paid"
            ? "Your withdrawal was sent to your bank."
            : "Your withdrawal is being processed. This page updates when it is done."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The withdrawal could not be sent.");
    } finally {
      setConfirming(false);
      setSubmitting(false);
      await load();
    }
  };

  const header = (
    <Link href="/dashboard/earnings" className="inline-flex items-center gap-2 text-ink">
      <ChevronLeft size={22} />
      <span className="text-lg font-bold">Wallet</span>
    </Link>
  );

  if (loading) {
    return (
      <div className="max-w-lg space-y-5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-lg space-y-5">
        {header}
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
          {error ?? "Couldn't load your wallet."}
        </p>
      </div>
    );
  }

  const { rules } = data;
  const blocked = blockedReason(data);

  return (
    <div className="max-w-lg space-y-5">
      {header}

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}
      {notice && (
        <p className="rounded-xl bg-status-success-bg p-3 text-sm text-status-success">{notice}</p>
      )}

      <Card className="p-5">
        <p className="text-xs text-ink-muted">Available balance</p>
        <p className="mt-1 text-3xl font-bold text-ink">{naira(data.availableKobo)}</p>
        <p className="mt-2 text-xs text-ink-faint">
          Withdrawals are on {rules.daysLabel}, once a day.{" "}
          {rules.isWithdrawalDay
            ? data.withdrawnToday
              ? "You have already withdrawn today."
              : "You can withdraw today."
            : `Next withdrawal day: ${rules.nextDay}.`}
        </p>
        <p className="mt-1 text-xs text-ink-faint">Minimum withdrawal: {naira(rules.minPayoutKobo)}</p>
      </Card>

      {!confirming ? (
        <div>
          <button
            onClick={() => {
              setNotice(null);
              setError(null);
              setConfirming(true);
            }}
            disabled={blocked !== null}
            className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-50"
          >
            Withdraw {naira(data.availableKobo)}
          </button>
          {blocked && <p className="mt-2 text-center text-xs text-ink-muted">{blocked}</p>}
        </div>
      ) : (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-ink">
            Send <b>{naira(data.availableKobo)}</b> to{" "}
            <b>{data.bank?.accountName}</b> ({data.bank?.bankName} {"\u2022\u2022\u2022\u2022"}
            {data.bank?.last4})?
          </p>
          <p className="text-xs text-ink-muted">You can only withdraw once a day.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="rounded-xl border border-surface-border bg-white py-3.5 text-sm font-bold text-ink-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={withdraw}
              disabled={submitting}
              className="rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Confirm"}
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Pending</p>
          <p className="mt-1 text-lg font-bold text-ink">{naira(data.pendingKobo)}</p>
          <p className="text-xs text-ink-faint">Orders in progress</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Paid out</p>
          <p className="mt-1 text-lg font-bold text-ink">{naira(data.paidOutKobo)}</p>
          {data.processingKobo > 0 && (
            <p className="text-xs text-ink-faint">{naira(data.processingKobo)} processing</p>
          )}
        </Card>
      </div>

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

      <div>
        <h2 className="mb-2 text-sm font-bold text-ink">History</h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing here yet.</p>
        ) : (
          <Card className="divide-y divide-surface-border">
            {data.history.map((h) => {
              const isPayout = h.kind === "payout";
              const st = isPayout ? payoutLabel(h.status) : null;
              return (
                <div key={h.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{h.label}</p>
                    <p className="text-xs text-ink-faint">
                      {new Date(h.date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}
                      {st && (
                        <>
                          {" \u2022 "}
                          <span className={st.cls}>{st.text}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <p className={`shrink-0 font-bold ${isPayout ? "text-ink" : "text-status-success"}`}>
                    {isPayout ? "\u2212" : "+"}
                    {naira(h.amountKobo)}
                  </p>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}