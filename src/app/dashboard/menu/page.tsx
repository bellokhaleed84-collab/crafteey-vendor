"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  inStock: boolean;
}

type FilterKey = "all" | "available" | "out";

export default function MenuPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/products");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your menu."));
      const data = await res.json();
      setProducts(data.products ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your menu.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleStock = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(getToken, `/api/products/${p._id}`, {
        method: "PATCH",
        body: JSON.stringify({ inStock: !p.inStock }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't update stock."));
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update stock.");
    }
  };

  const availableCount = products.filter((p) => p.inStock).length;
  const outCount = products.filter((p) => !p.inStock).length;
  const filtered = products.filter((p) => {
    if (filter === "available") return p.inStock;
    if (filter === "out") return !p.inStock;
    return true;
  });

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: products.length },
    { key: "available", label: "Available", count: availableCount },
    { key: "out", label: "Out of Stock", count: outCount },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Products</h1>
        <button
          onClick={() => router.push("/dashboard/menu/new")}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-ink"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? "bg-brand text-brand-ink"
                : "bg-surface-border text-ink-muted"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      {loading ? (
        <ProductsSkeleton />
      ) : filtered.length === 0 && !error ? (
        <p className="text-sm text-ink-muted">
          {products.length === 0 ? "No menu items yet. Add your first one." : "Nothing matches this filter."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card
              key={p._id}
              onClick={() => router.push(`/dashboard/menu/${p._id}`)}
              className="flex cursor-pointer items-center gap-3 p-3"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-light text-lg">
                  🍽️
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{p.name}</p>
                <p className="text-sm font-semibold text-ink">₦{p.price.toLocaleString()}</p>
                <button
                  onClick={(e) => toggleStock(p, e)}
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    p.inStock ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {p.inStock ? "Available" : "Out of Stock"}
                </button>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-faint" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <Card key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}