"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface VariantOption {
  label: string;
  priceDelta: number;
}
interface Variant {
  name: string;
  options: VariantOption[];
}
interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  variants?: Variant[];
  inStock: boolean;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/products");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load this product."));
      const data = await res.json();
      const found = ((data.products ?? []) as Product[]).find((p) => p._id === id);
      setProduct(found ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this product.");
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStock = async () => {
    if (!product) return;
    setBusy(true);
    try {
      const res = await apiFetch(getToken, `/api/products/${product._id}`, {
        method: "PATCH",
        body: JSON.stringify({ inStock: !product.inStock }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't update stock."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update stock.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !confirm("Delete this product? This can't be undone.")) return;
    setBusy(true);
    try {
      const res = await apiFetch(getToken, `/api/products/${product._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Couldn't delete this product."));
      router.replace("/dashboard/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this product.");
      setBusy(false);
    }
  };

  const back = (
    <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-ink-muted">
      <ChevronLeft size={16} /> Back to products
    </button>
  );

  if (loading) return <ProductDetailSkeleton back={back} />;

  if (!product) {
    return (
      <div className="max-w-lg space-y-4">
        {back}
        <p className="text-sm text-ink-muted">{error ?? "Product not found."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      {back}

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-56 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-56 w-full items-center justify-center rounded-2xl bg-brand-light text-4xl">
          🍽️
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-ink">{product.name}</h1>
          <button
            onClick={toggleStock}
            disabled={busy}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              product.inStock ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"
            }`}
          >
            {product.inStock ? "Available" : "Out of Stock"}
          </button>
        </div>
        <p className="mt-1 text-lg font-bold text-ink">₦{product.price.toLocaleString()}</p>
        {product.description && <p className="mt-2 text-sm text-ink-muted">{product.description}</p>}
        <span className="mt-2 inline-block rounded-full bg-surface-border px-2.5 py-1 text-xs font-medium text-ink-muted">
          {product.category}
        </span>
      </div>

      {product.variants && product.variants.length > 0 && (
        <div className="space-y-3">
          {product.variants.map((v, i) => (
            <Card key={i} className="p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{v.name}</p>
              <div className="space-y-1.5">
                {v.options.map((o, j) => (
                  <div key={j} className="flex justify-between text-sm text-ink-muted">
                    <span>{o.label}</span>
                    <span>
                      {o.priceDelta > 0 ? "+" : ""}
                      {o.priceDelta !== 0 ? `₦${o.priceDelta.toLocaleString()}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-status-danger py-3 font-semibold text-status-danger disabled:opacity-60"
      >
        <Trash2 size={16} /> Delete product
      </button>
    </div>
  );
}

function ProductDetailSkeleton({ back }: { back: React.ReactNode }) {
  return (
    <div className="max-w-lg space-y-5">
      {back}
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}