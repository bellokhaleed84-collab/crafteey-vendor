"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ChevronRight, LifeBuoy, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface VendorLite {
  businessName: string;
  category: string;
  email: string;
  logoUrl?: string;
  isApproved: boolean;
}

export default function MorePage() {
  const { signOut, getToken } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(getToken, "/api/vendor/me");
        if (res.ok) setVendor((await res.json()).vendor);
      } catch {
        // The header is optional; the links below still work.
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Profile</h1>

      {loading ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : (
        vendor && (
          <Card className="flex items-center gap-3 p-4">
            {vendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-xl font-bold text-brand-dark">
                {vendor.businessName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-bold text-ink">
                <span className="truncate">{vendor.businessName}</span>
                {vendor.isApproved && <BadgeCheck size={16} className="shrink-0 text-status-info" />}
              </p>
              <p className="truncate text-xs text-ink-muted">{vendor.category}</p>
              <p className="truncate text-xs text-ink-faint">{vendor.email}</p>
            </div>
          </Card>
        )
      )}

      <Card className="divide-y divide-surface-border">
        <Link href="/dashboard/settings" className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
            <Settings size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Store settings</p>
            <p className="text-xs text-ink-muted">Profile, hours, location, staff</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-faint" />
        </Link>
        <div className="flex items-center gap-3 p-4 opacity-50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-faint">
            <LifeBuoy size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Help & support</p>
            <p className="text-xs text-ink-muted">Coming soon</p>
          </div>
        </div>
      </Card>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-2xl border border-surface-border bg-white p-4 text-left text-status-danger shadow-card"
      >
        <LogOut size={20} />
        <span className="font-semibold">Log Out</span>
      </button>
    </div>
  );
}