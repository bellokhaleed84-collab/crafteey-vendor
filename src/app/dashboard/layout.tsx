"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, ClipboardList, Package, Wallet, MoreHorizontal } from "lucide-react";
import VendorGuard from "@/components/VendorGuard";

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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <VendorGuard>
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
    </VendorGuard>
  );
}