"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Share2, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface StaffMember {
  _id: string;
  name: string;
  email: string | null;
  status: "invited" | "active";
  createdAt: string;
}

export default function StaffPage() {
  const { getToken } = useAuth();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ name: string; email: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/staff");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your staff."));
      const data = (await res.json()) as { staff: StaffMember[] };
      setStaff(data.staff);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your staff.");
      setStaff([]);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const addStaff = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(getToken, "/api/vendor/staff", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        setError(await readError(res, "Couldn't add this person."));
        return;
      }
      const data = (await res.json()) as { staff: StaffMember };
      setAdded({ name: data.staff.name, email: data.staff.email ?? email });
      setName("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this person.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: StaffMember) => {
    if (!window.confirm(`Remove ${m.name}? They will lose access to your orders right away.`)) return;
    setError(null);
    try {
      const res = await apiFetch(getToken, `/api/vendor/staff/${m._id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await readError(res, "Couldn't remove this person."));
        return;
      }
      if (added?.name === m.name) setAdded(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove this person.");
    }
  };

  const inviteMessage = (toEmail: string) =>
    `You've been added as staff to receive orders on Crafteey Vendor. Create your staff account here: ${window.location.origin}/staff-signup (use this email: ${toEmail}), then tap the verification link we email you.`;

  const field =
    "w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand";

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/settings" aria-label="Back to settings" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Staff</span>
      </Link>

      <p className="text-sm text-ink-muted">
        Staff can see, accept and reject your orders and mark them ready. They can&apos;t see your earnings,
        menu or settings.
      </p>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      {added && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-bold text-ink">{added.name} has been added</p>
          <p className="text-xs text-ink-muted">
            Ask them to create a staff account using <span className="font-semibold">{added.email}</span> and
            verify that email. Their orders screen opens as soon as they sign in.
          </p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(inviteMessage(added.email))}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-xs font-bold text-brand-ink"
          >
            <Share2 size={14} />
            Tell them on WhatsApp
          </a>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold text-ink">Add staff</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Name"
          className={field}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Their email address"
          autoCapitalize="none"
          className={field}
        />
        <button
          type="button"
          onClick={addStaff}
          disabled={busy || name.trim().length < 2 || !email.includes("@")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-60"
        >
          <UserPlus size={16} />
          {busy ? "Adding..." : "Add staff"}
        </button>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">Your team</p>
        {staff === null ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : staff.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-ink-muted">
            No staff yet.
          </p>
        ) : (
          staff.map((m) => (
            <Card key={m._id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{m.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {m.email} {"\u00B7"} {m.status === "active" ? "Active" : "Waiting for them to sign up"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(m)}
                aria-label={`Remove ${m.name}`}
                className="flex h-10 w-10 items-center justify-center text-status-danger"
              >
                <Trash2 size={18} />
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}