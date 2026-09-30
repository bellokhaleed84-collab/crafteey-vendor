"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import ImageUpload from "@/components/ImageUpload";

interface Vendor {
  businessName: string;
  category: string;
  phone: string;
  address: string;
  description?: string;
  logoUrl?: string;
  tagline?: string;
}

export default function StoreInformationPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/me");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your store."));
      const data = await res.json();
      setVendor(data.vendor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your store.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Partial<Vendor>): Promise<string | null> => {
    try {
      const res = await apiFetch(getToken, "/api/vendor/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) return await readError(res, "Couldn't save your changes.");
      await load();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Couldn't save your changes.";
    }
  };

  // The logo saves as soon as it's uploaded (or removed).
  const handleLogoChange = async (url: string) => {
    const message = await save({ logoUrl: url });
    setError(message);
  };

  if (loading) return <ProfileSkeleton />;
  if (!vendor) {
    return (
      <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
        {error ?? "Vendor not found."}
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink-muted">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-ink">Store Information</h1>
      </div>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Store logo</label>
          <p className="mb-2 text-xs text-ink-muted">Shown on your store in the Crafteey Hub.</p>
          <ImageUpload kind="logo" value={vendor.logoUrl || ""} onChange={handleLogoChange} />
        </div>

        <EditableField label="Business name" value={vendor.businessName} onSave={(v) => save({ businessName: v })} />
        <EditableField
          label="Tagline"
          hint="A short line shown under your store name in the Hub (up to 80 characters)."
          value={vendor.tagline || ""}
          onSave={(v) => save({ tagline: v })}
        />
        <EditableField label="Phone" value={vendor.phone} onSave={(v) => save({ phone: v })} />
        <EditableField label="Address" value={vendor.address} onSave={(v) => save({ address: v })} />
        <EditableField
          label="Description"
          value={vendor.description || ""}
          onSave={(v) => save({ description: v })}
        />
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onSave,
  hint,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<string | null>;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(value);
    setFieldError(null);
    setEditing(true);
  };

  const commit = async () => {
    setBusy(true);
    const message = await onSave(draft);
    setBusy(false);
    if (message) {
      setFieldError(message);
    } else {
      setEditing(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {hint && <p className="mb-1 text-xs text-ink-muted">{hint}</p>}
      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <button
              onClick={commit}
              disabled={busy}
              className="rounded-xl bg-brand px-3 text-sm font-semibold text-brand-ink disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="rounded-xl border border-surface-border px-3 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
          {fieldError && <p className="text-xs text-status-danger">{fieldError}</p>}
        </div>
      ) : (
        <Card onClick={startEdit} className="cursor-pointer px-3 py-2.5 text-ink">
          {value || <span className="text-ink-faint">Not set</span>}
        </Card>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-lg space-y-5">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-28 w-28 rounded-2xl" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      ))}
    </div>
  );
}