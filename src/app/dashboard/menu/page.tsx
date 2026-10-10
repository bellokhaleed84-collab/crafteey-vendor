"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Search, Package } from "lucide-react";
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
  const [query, setQuery] = useState("");

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
  const q = query.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (filter === "available" && !p.inStock) return false;
    if (filter === "out" && p.inStock) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: products.length },
    { key: "available", label: "Available", count: availableCount },
    { key: "out", label: "Out of Stock", count: outCount },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">My Products</h1>

      <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 focus-within:border-brand">
        <Search size={18} className="shrink-0 text-ink-faint" />
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
              filter === f.key
                ? "border-brand bg-brand text-brand-ink"
                : "border-surface-border bg-white text-ink-muted"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {loading ? (
        <ProductsSkeleton />
      ) : filtered.length === 0 && !error ? (
        <p className="text-sm text-ink-muted">
          {products.length === 0 ? "No menu items yet. Add your first one." : "Nothing matches."}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
                  <Package size={22} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{p.name}</p>
                <p className="truncate text-xs text-ink-faint">{p.category}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm font-bold text-ink">
                    {"\u20A6"}
                    {p.price.toLocaleString()}
                  </p>
                  <button
                    onClick={(e) => toggleStock(p, e)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      p.inStock
                        ? "bg-status-success-bg text-status-success"
                        : "bg-status-danger-bg text-status-danger"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {p.inStock ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-faint" />
            </Card>
          ))}
        </div>
      )}

      <button
        aria-label="Add product"
        onClick={() => router.push("/dashboard/menu/new")}
        className="fixed bottom-24 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-lg"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <Card key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}