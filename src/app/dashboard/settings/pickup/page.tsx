"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const MAX_LEN = 200;

// Tap to add, so most vendors never need to type.
const CHIPS = [
  "Call me when you arrive.",
  "Use the side gate.",
  "Ask for the order at the counter.",
  "We are on the first floor.",
  "Park in front of the shop.",
];

export default function PickupInstructionsPage() {
  const { getToken } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/pickup-instructions");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your note."));
      const data = await res.json();
      setText(data.text ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your note.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const addChip = (c: string) => {
    setSaved(false);
    setText((prev) => {
      const next = prev.trim() ? `${prev.trim()} ${c}` : c;
      return next.length <= MAX_LEN ? next : prev;
    });
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await apiFetch(getToken, "/api/vendor/pickup-instructions", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setError(await readError(res, "Couldn't save your note."));
        return;
      }
      const data = await res.json();
      setText(data.text ?? "");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Pickup Instructions</span>
      </Link>

      <p className="text-sm text-ink-muted">
        A short note for riders when they come to collect an order. Tell them where to go and who to ask for.
      </p>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}
      {saved && (
        <p className="rounded-xl bg-status-success-bg p-3 text-sm text-status-success">Your note has been saved.</p>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : (
        <>
          <Card className="space-y-2 p-4">
            <textarea
              rows={4}
              maxLength={MAX_LEN}
              value={text}
              onChange={(e) => {
                setSaved(false);
                setText(e.target.value);
              }}
              placeholder="e.g. Use the side gate and ask for the order at the counter."
              className="w-full resize-none rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
            />
            <p className="text-right text-xs text-ink-faint">
              {text.length}/{MAX_LEN}
            </p>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-muted">Tap to add</p>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addChip(c)}
                  className="rounded-full border border-surface-border bg-white px-4 py-2.5 text-xs font-semibold text-ink-muted"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save note"}
          </button>
        </>
      )}
    </div>
  );
}