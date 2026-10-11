"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CreditCard, ClipboardList, Smartphone, User, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";

const OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "payment", label: "Payments or payouts", icon: CreditCard },
  { value: "order", label: "An order", icon: ClipboardList },
  { value: "app", label: "App not working", icon: Smartphone },
  { value: "account", label: "My account", icon: User },
  { value: "other", label: "Something else", icon: HelpCircle },
];

export default function VendorReportPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = !!category && message.trim().length >= 5 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(getToken, "/api/vendor/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category, message: message.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        router.replace(`/dashboard/more/help/tickets/${data.id}`);
        return;
      }
      setError(await readError(res, "Couldn't send your report. Try again."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your report. Try again.");
    }
    setSending(false);
  };

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/more/help" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Talk to support</span>
      </Link>
      <p className="text-sm text-ink-muted">Tell us what went wrong. Our team will chat with you here.</p>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-ink">What is it about?</h2>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={selected}
                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center text-sm font-semibold ${
                  selected ? "border-brand bg-brand-light text-ink" : "border-surface-border bg-white text-ink-muted"
                }`}
              >
                <Icon size={20} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-ink">What happened?</h2>
        <textarea
          rows={5}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us in your own words"
          className="w-full resize-none rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand"
        />
        <p className="text-xs text-ink-faint">Please do not put passwords or card details here.</p>
      </section>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send to support"}
      </button>
    </div>
  );
}