"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import ImageUpload from "@/components/ImageUpload";

interface VariantOption {
  label: string;
  priceDelta: string;
}
interface VariantDraft {
  name: string;
  options: VariantOption[];
}

export default function AddProductPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    section: "",
    price: "",
    imageUrl: "",
  });
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Suggest the vendor's existing sections so names stay consistent.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(getToken, "/api/products");
        if (!res.ok) return;
        const data = await res.json();
        const found = new Set<string>();
        for (const p of (data.products ?? []) as { section?: string }[]) {
          if (p.section) found.add(p.section);
        }
        setSections([...found].sort());
      } catch {
        // Suggestions are optional; ignore failures.
      }
    })();
  }, [getToken]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addVariant = () => setVariants((v) => [...v, { name: "", options: [{ label: "", priceDelta: "0" }] }]);
  const removeVariant = (i: number) => setVariants((v) => v.filter((_, idx) => idx !== i));
  const updateVariantName = (i: number, name: string) =>
    setVariants((v) => v.map((variant, idx) => (idx === i ? { ...variant, name } : variant)));
  const addOption = (i: number) =>
    setVariants((v) =>
      v.map((variant, idx) =>
        idx === i ? { ...variant, options: [...variant.options, { label: "", priceDelta: "0" }] } : variant
      )
    );
  const removeOption = (i: number, j: number) =>
    setVariants((v) =>
      v.map((variant, idx) =>
        idx === i ? { ...variant, options: variant.options.filter((_, oj) => oj !== j) } : variant
      )
    );
  const updateOption = (i: number, j: number, key: keyof VariantOption, value: string) =>
    setVariants((v) =>
      v.map((variant, idx) =>
        idx === i
          ? {
              ...variant,
              options: variant.options.map((o, oj) => (oj === j ? { ...o, [key]: value } : o)),
            }
          : variant
      )
    );

  const handleSave = async () => {
    if (uploading) return setError("Please wait for the photo to finish uploading.");

    const price = Number(form.price);
    if (!form.name.trim()) return setError("Enter a product name.");
    if (!form.price || !Number.isFinite(price) || price <= 0) {
      return setError("Enter a price above ₦0.");
    }
    if (form.section.trim().length > 40) {
      return setError("Menu section must be 40 characters or fewer.");
    }
    for (const v of variants) {
      if (!v.name.trim()) return setError("Every variant needs a name (e.g. Size).");
      if (v.options.some((o) => !o.label.trim())) return setError("Every variant option needs a label.");
    }

    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch(getToken, "/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          section: form.section.trim() || undefined,
          price,
          imageUrl: form.imageUrl || undefined,
          variants: variants.map((v) => ({
            name: v.name.trim(),
            options: v.options.map((o) => ({
              label: o.label.trim(),
              priceDelta: Number(o.priceDelta) || 0,
            })),
          })),
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't save this product."));
      router.replace("/dashboard/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink-muted">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-ink">Add Product</h1>
      </div>

      {error && (
        <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
      )}

      <Field label="Product Name" required>
        <input
          placeholder="e.g. Jollof Rice & Chicken"
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </Field>

      <Field label="Product Photo">
        <ImageUpload
          value={form.imageUrl}
          onChange={(url) => update("imageUrl", url)}
          onUploadingChange={setUploading}
        />
      </Field>

      <Field label="Description">
        <textarea
          placeholder="Well seasoned jollof rice with grilled chicken and fresh salad."
          rows={3}
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </Field>

      <Field label="Menu section">
        <input
          list="menu-sections"
          maxLength={40}
          placeholder="e.g. Rice Dishes"
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          value={form.section}
          onChange={(e) => update("section", e.target.value)}
        />
        <datalist id="menu-sections">
          {sections.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-ink-faint">
          Optional. Groups items on your store menu in the Hub, like Rice Dishes or Drinks.
        </p>
      </Field>

      <Field label="Price (₦)" required>
        <input
          type="number"
          min="0"
          placeholder="4500"
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          value={form.price}
          onChange={(e) => update("price", e.target.value)}
        />
      </Field>

      {/* Variants — e.g. "Size" with "Regular"/"Large" options, each with an
          optional price delta. This also covers simple add-ons: a variant
          named "Extras" with one option per add-on works fine. */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Variants</label>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 text-xs font-semibold text-brand-dark"
          >
            <Plus size={14} /> Add variant
          </button>
        </div>

        {variants.length === 0 && (
          <p className="text-xs text-ink-faint">No variants — this product will just use the base price.</p>
        )}

        <div className="space-y-3">
          {variants.map((v, i) => (
            <Card key={i} className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Variant name (e.g. Size)"
                  className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  value={v.name}
                  onChange={(e) => updateVariantName(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  aria-label="Remove variant"
                  className="text-ink-faint"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {v.options.map((o, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      placeholder="Option (e.g. Large)"
                      className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
                      value={o.label}
                      onChange={(e) => updateOption(i, j, "label", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="+₦0"
                      className="w-24 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
                      value={o.priceDelta}
                      onChange={(e) => updateOption(i, j, "priceDelta", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i, j)}
                      aria-label="Remove option"
                      className="text-ink-faint"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(i)}
                  className="text-xs font-medium text-brand-dark"
                >
                  + Add option
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full rounded-xl bg-brand py-3 font-semibold text-brand-ink disabled:opacity-60"
      >
        {uploading ? "Uploading photo..." : saving ? "Saving..." : "Save Product"}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">
        {label} {required && <span className="text-status-danger">*</span>}
      </label>
      {children}
    </div>
  );
}