"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import OptionGroupsEditor, {
  toDrafts,
  toPayload,
  validateDrafts,
  type ApiGroup,
  type GroupDraft,
} from "@/components/OptionGroupsEditor";

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
  section?: string;
  variants?: Variant[];
  optionGroups?: ApiGroup[];
  inStock: boolean;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [editingSection, setEditingSection] = useState(false);
  const [sectionDraft, setSectionDraft] = useState("");
  const [editingOptions, setEditingOptions] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState<GroupDraft[]>([]);
  const [uploadingOptions, setUploadingOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, "/api/products");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load this product."));
      const data = await res.json();
      const all = (data.products ?? []) as Product[];
      setProduct(all.find((p) => p._id === id) ?? null);
      setSections([...new Set(all.map((p) => p.section).filter((s): s is string => Boolean(s)))].sort());
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

  const saveSection = async () => {
    if (!product) return;
    setBusy(true);
    try {
      const res = await apiFetch(getToken, `/api/products/${product._id}`, {
        method: "PATCH",
        body: JSON.stringify({ section: sectionDraft }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't update the menu section."));
      setEditingSection(false);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the menu section.");
    } finally {
      setBusy(false);
    }
  };

  const saveOptions = async () => {
    if (!product) return;
    if (uploadingOptions) return setError("Please wait for the photo to finish uploading.");
    const problem = validateDrafts(optionDrafts);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      const res = await apiFetch(getToken, `/api/products/${product._id}`, {
        method: "PATCH",
        body: JSON.stringify({ optionGroups: toPayload(optionDrafts) }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't save the options."));
      setEditingOptions(false);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the options.");
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
    <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-ink">
      <ChevronLeft size={22} />
      <span className="text-lg font-bold">Product</span>
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

  const groups = product.optionGroups ?? [];

  return (
    <div className="max-w-lg space-y-5">
      {back}

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}

      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-56 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-56 w-full items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
          <Package size={40} />
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-ink">{product.name}</h1>
          <button
            onClick={toggleStock}
            disabled={busy}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${
              product.inStock ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"
            }`}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </button>
        </div>
        <p className="mt-1 text-lg font-bold text-ink">
          {"\u20A6"}
          {product.price.toLocaleString()}
        </p>
        {product.description && <p className="mt-2 text-sm text-ink-muted">{product.description}</p>}

        <div className="mt-3">
          {editingSection ? (
            <div className="flex gap-2">
              <input
                list="menu-sections"
                maxLength={40}
                autoFocus
                placeholder="e.g. Rice Dishes"
                className="min-w-0 flex-1 rounded-xl border border-surface-border bg-white px-3 py-3 text-sm text-ink outline-none focus:border-brand"
                value={sectionDraft}
                onChange={(e) => setSectionDraft(e.target.value)}
              />
              <datalist id="menu-sections">
                {sections.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <button
                onClick={saveSection}
                disabled={busy}
                className="rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={() => setEditingSection(false)}
                disabled={busy}
                className="rounded-xl border border-surface-border px-4 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSectionDraft(product.section ?? "");
                setEditingSection(true);
              }}
              className="inline-block rounded-full border border-surface-border bg-white px-3.5 py-2 text-xs font-semibold text-ink-muted"
            >
              {product.section ? `Menu section: ${product.section}` : "+ Add menu section"}
            </button>
          )}
        </div>
      </div>

      {/* Options and extras */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Options and extras</p>
          {!editingOptions && (
            <button
              onClick={() => {
                setOptionDrafts(toDrafts(product.optionGroups));
                setEditingOptions(true);
              }}
              className="px-1 py-2 text-xs font-semibold text-brand-dark"
            >
              {groups.length > 0 ? "Edit options" : "+ Add options"}
            </button>
          )}
        </div>

        {editingOptions ? (
          <div className="space-y-3">
            <OptionGroupsEditor
              value={optionDrafts}
              onChange={setOptionDrafts}
              onUploadingChange={setUploadingOptions}
            />
            <div className="flex gap-2">
              <button
                onClick={saveOptions}
                disabled={busy || uploadingOptions}
                className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-60"
              >
                {uploadingOptions ? "Uploading photo..." : busy ? "Saving..." : "Save options"}
              </button>
              <button
                onClick={() => setEditingOptions(false)}
                disabled={busy}
                className="rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-ink-faint">
            No options. Customers get this item at the price above.
          </p>
        ) : (
          groups.map((g) => (
            <Card key={g.id} className="p-4">
              <p className="mb-2 text-sm font-semibold text-ink">
                {g.name}
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  {g.required ? "Must choose" : "Optional"}
                  {g.single ? ", pick one" : ""}
                </span>
              </p>
              <div className="space-y-2">
                {g.choices.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm text-ink-muted">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand-dark">
                        <Package size={16} />
                      </span>
                    )}
                    <span className="flex-1">
                      {c.name}
                      {!g.single && c.maxQty > 1 ? ` (up to ${c.maxQty})` : ""}
                    </span>
                    <span>{c.price > 0 ? "+\u20A6" + c.price.toLocaleString() : "Included"}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>

      {product.variants && product.variants.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-ink-faint">Old variants (customers no longer see these)</p>
          {product.variants.map((v, i) => (
            <Card key={i} className="p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{v.name}</p>
              <div className="space-y-1.5">
                {v.options.map((o, j) => (
                  <div key={j} className="flex justify-between text-sm text-ink-muted">
                    <span>{o.label}</span>
                    <span>
                      {o.priceDelta > 0 ? "+" : ""}
                      {o.priceDelta !== 0 ? "\u20A6" + o.priceDelta.toLocaleString() : "\u2014"}
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
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-status-danger bg-white py-3.5 text-sm font-bold text-status-danger disabled:opacity-60"
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