"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Phone, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Customer {
  name: string;
  phone: string;
  orders: number;
  spentKobo: number;
  lastOrderAt: string;
}

function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export default function CustomersPage() {
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/customers");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your customers."));
      setCustomers((await res.json()).customers ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your customers.");
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/earnings" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Customers</span>
      </Link>

      <p className="text-xs text-ink-faint">
        People who have had a delivered order from you. You see their name and phone only, never their address.
      </p>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {!customers && !error ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : customers && customers.length === 0 ? (
        <p className="text-sm text-ink-muted">No customers yet. They show up after their first delivered order.</p>
      ) : customers ? (
        <div className="space-y-3">
          {customers.map((c, i) => (
            <Card key={i} className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark">
                <User size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{c.name}</p>
                {c.phone && <p className="truncate text-xs text-ink-muted">{c.phone}</p>}
                <p className="mt-0.5 text-xs text-ink-faint">
                  {c.orders} order{c.orders === 1 ? "" : "s"} {"\u2022"} {naira(c.spentKobo)} {"\u2022"} last{" "}
                  {new Date(c.lastOrderAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}
                </p>
              </div>
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  aria-label={`Call ${c.name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink"
                >
                  <Phone size={18} />
                </a>
              )}
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}