"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Store,
  MapPin,
  Clock,
  Navigation,
  FileText,
  Power,
  ChevronRight,
  Award,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { isVendorApproved } from "@/lib/vendorApproval";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Vendor {
  businessName: string;
  category: string;
  phone: string;
  address: string;
  description?: string;
  isOpen: boolean;
  isApproved: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
}

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const toggleOpen = async () => {
    if (!vendor) return;
    setSaving(true);
    try {
      const res = await apiFetch(getToken, "/api/vendor/me", {
        method: "PATCH",
        body: JSON.stringify({ isOpen: !vendor.isOpen }),
      });
      if (!res.ok) {
        setError(await readError(res, "Couldn't update store status."));
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update store status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SettingsSkeleton />;
  if (!vendor) {
    return (
      <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
        {error ?? "Vendor not found."}
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-ink">Store Settings</h1>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-xl">
          🍽️
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{vendor.businessName}</p>
          <Link href="/dashboard/settings/profile" className="text-xs font-medium text-brand-dark">
            Edit profile
          </Link>
        </div>
      </Card>

      <Card className="divide-y divide-surface-border">
        <SettingsRow
          href="/dashboard/settings/profile"
          icon={Store}
          label="Store Information"
          hint="Name, phone, category, description"
        />
        <SettingsRow
          href="/dashboard/settings/location"
          icon={MapPin}
          label="Location & Map"
          hint="Pin your pickup coordinates"
        />
        <SettingsRow
          href="/dashboard/settings/tier"
          icon={Award}
          label="Store Tier"
          hint="Commission and Hub visibility"
        />
        <SettingsRow
          href="/dashboard/settings/staff"
          icon={Users}
          label="Staff"
          hint="Let your team receive orders"
        />
        <SettingsRow
          href="/dashboard/settings/hours"
          icon={Clock}
          label="Opening Hours"
          hint="When you open and close each day"
        />
        <ComingSoonRow icon={Navigation} label="Pickup Instructions" hint="Notes for riders" />
        <ComingSoonRow icon={FileText} label="Business Documents" hint="CAC, ID and verification" />
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
            <Power size={16} />
          </span>
          <div>
            <p className="font-semibold text-ink">Store Status</p>
            <p className="text-xs text-ink-muted">{vendor.isOpen ? "Open — accepting orders" : "Closed"}</p>
          </div>
        </div>
        <button
          onClick={toggleOpen}
          disabled={saving || !isVendorApproved(vendor)}
          title={!isVendorApproved(vendor) ? "Your store must be approved before it can open." : undefined}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            vendor.isOpen ? "bg-status-success-bg text-status-success" : "bg-surface-border text-ink-muted"
          }`}
        >
          {saving ? "Updating..." : vendor.isOpen ? "Open" : "Closed"}
        </button>
      </Card>
    </div>
  );
}

function SettingsRow({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Store;
  label: string;
  hint: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink-faint" />
    </Link>
  );
}

function ComingSoonRow({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Store;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 opacity-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-border text-ink-faint">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint} — coming soon</p>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-lg space-y-5">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
    </div>
  );
}