"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Landmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Bank {
  name: string;
  code: string;
}

interface BankState {
  hasBankAccount: boolean;
  accountName: string;
  bankName: string;
  last4: string;
}

export default function BankAccountPage() {
  const { getToken } = useAuth();
  const [state, setState] = useState<BankState | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [stateRes, banksRes] = await Promise.all([
        apiFetch(getToken, "/api/vendor/bank-account"),
        apiFetch(getToken, "/api/vendor/banks"),
      ]);
      if (!stateRes.ok) throw new Error(await readError(stateRes, "Couldn't load your bank account."));
      setState(await stateRes.json());
      if (banksRes.ok) setBanks((await banksRes.json()).banks ?? []);
      else setError(await readError(banksRes, "Couldn't load the bank list."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your bank account.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setError(null);
    if (!bankCode) {
      setError("Choose your bank.");
      return;
    }
    if (accountNumber.length !== 10) {
      setError("Enter a 10-digit account number.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(getToken, "/api/vendor/bank-account", {
        method: "POST",
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      if (!res.ok) {
        setError(await readError(res, "We couldn't verify that account."));
        return;
      }
      setState(await res.json());
      setEditing(false);
      setJustSaved(true);
      setBankCode("");
      setAccountNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't verify that account.");
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-ink">
      <ChevronLeft size={22} />
      <span className="text-lg font-bold">Bank Account</span>
    </Link>
  );

  if (loading) {
    return (
      <div className="max-w-lg space-y-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="max-w-lg space-y-5">
        {header}
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">
          {error ?? "Couldn't load your bank account."}
        </p>
      </div>
    );
  }

  const showForm = !state.hasBankAccount || editing;

  return (
    <div className="max-w-lg space-y-5">
      {header}

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {justSaved && !showForm && (
        <p className="rounded-xl bg-status-success-bg p-3 text-sm text-status-success">
          Account verified and saved.
        </p>
      )}

      {!showForm ? (
        <>
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Landmark size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{state.accountName}</p>
              <p className="text-xs text-ink-muted">
                {state.bankName} {"\u2022"} {"\u2022\u2022\u2022\u2022"}
                {state.last4}
              </p>
            </div>
          </Card>
          <button
            onClick={() => {
              setEditing(true);
              setJustSaved(false);
              setError(null);
            }}
            className="w-full rounded-xl border border-surface-border bg-white py-3.5 text-sm font-bold text-ink"
          >
            Change bank account
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Your earnings will be paid to this account. We check the account name with your bank
            before saving.
          </p>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Bank</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-surface-border bg-white px-3 py-3.5 text-sm text-ink"
            >
              <option value="">Select your bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Account number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              disabled={saving}
              className="w-full rounded-xl border border-surface-border bg-white px-3 py-3.5 text-sm text-ink"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-50"
          >
            {saving ? "Verifying..." : "Verify & save"}
          </button>

          {state.hasBankAccount && (
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={saving}
              className="w-full rounded-xl border border-surface-border bg-white py-3.5 text-sm font-bold text-ink-muted"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}