"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ClipboardList, Package, Wallet, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreAccess } from "@/contexts/StoreRoleContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home, match: ["/dashboard"], exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList, match: ["/dashboard/orders"] },
  { href: "/dashboard/menu", label: "Products", icon: Package, match: ["/dashboard/menu"] },
  { href: "/dashboard/earnings", label: "Earnings", icon: Wallet, match: ["/dashboard/earnings"] },
  {
    href: "/dashboard/more",
    label: "More",
    icon: MoreHorizontal,
    match: ["/dashboard/more", "/dashboard/settings"],
  },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { role, storeName } = useStoreAccess();

  // Staff only work orders. Anything else sends them back to Orders.
  const staffBlocked =
    role === "staff" && !(pathname === "/dashboard/orders" || pathname.startsWith("/dashboard/orders/"));

  useEffect(() => {
    if (staffBlocked) router.replace("/dashboard/orders");
  }, [staffBlocked, router]);

  if (role === "staff") {
    return (
      <div className="min-h-screen bg-surface-muted">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted">Working at</p>
            <p className="truncate text-sm font-bold text-ink">{storeName}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="rounded-full border border-surface-border px-3.5 py-1.5 text-xs font-semibold text-ink"
          >
            Log out
          </button>
        </header>
        <main className="mx-auto max-w-3xl p-6 pb-10">
          {staffBlocked ? <p className="text-sm text-ink-muted">Loading…</p> : children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <main className="mx-auto max-w-3xl p-6 pb-28">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-surface-border bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, match, exact }) => {
            const active = exact
              ? pathname === href
              : match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-brand-dark" : "text-ink-faint"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}