"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ChevronRight, LifeBuoy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";

const LINKS = [
  { href: "/dashboard/settings", label: "Store settings", hint: "Profile, hours and payouts", icon: Settings },
];

export default function MorePage() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">More</h1>

      <Card className="divide-y divide-surface-border">
        {LINKS.map(({ href, label, hint, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-4 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Icon size={18} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-ink">{label}</p>
              <p className="text-xs text-ink-muted">{hint}</p>
            </div>
            <ChevronRight size={18} className="text-ink-faint" />
          </Link>
        ))}
        <div className="flex items-center gap-4 p-4 opacity-50">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-border text-ink-faint">
            <LifeBuoy size={18} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-ink">Help & support</p>
            <p className="text-xs text-ink-muted">Coming soon</p>
          </div>
        </div>
      </Card>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-4 rounded-2xl border border-surface-border bg-surface p-4 text-left text-status-danger shadow-card"
      >
        <LogOut size={20} />
        <span className="font-semibold">Sign out</span>
      </button>
    </div>
  );
}