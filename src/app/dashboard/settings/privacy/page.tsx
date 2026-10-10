"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { friendlyAuthError } from "@/lib/authErrors";
import { Card } from "@/components/ui/Card";

const FIELD =
  "w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand";

export default function PrivacySecurityPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const user = auth.currentUser;
  const hasPassword = !!user?.providerData.some((p) => p.providerId === "password");

  const save = async () => {
    setError(null);
    setDone(false);
    if (!user || !user.email) return setError("You're signed out. Please log in again.");
    if (!current) return setError("Enter your current password.");
    if (next.length < 6) return setError("The new password must be at least 6 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError("Choose a password different from your current one.");

    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Your current password is wrong.");
      } else if (code === "auth/requires-recent-login") {
        setError("For safety, log out and log in again, then change your password.");
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Privacy & Security</span>
      </Link>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}
      {done && (
        <p className="rounded-xl bg-status-success-bg p-3 text-sm text-status-success">
          Your password has been changed.
        </p>
      )}

      {!hasPassword ? (
        <Card className="p-4 text-sm text-ink-muted">
          This account doesn&apos;t sign in with a password, so there is nothing to change here.
        </Card>
      ) : (
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Lock size={16} /> Change password
          </p>
          <input
            type="password"
            placeholder="Current password"
            className={FIELD}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <input
            type="password"
            placeholder="New password"
            className={FIELD}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            className={FIELD}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-60"
          >
            {busy ? "Saving..." : "Change password"}
          </button>
        </Card>
      )}
    </div>
  );
}