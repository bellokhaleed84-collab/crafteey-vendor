"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import ImageUpload from "@/components/ImageUpload";
import OptionGroupsEditor, {
  toPayload,
  validateDrafts,
  type GroupDraft,
} from "@/components/OptionGroupsEditor";

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
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingOptions, setUploadingOptions] = useState(false);

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

  const handleSave = async () => {
    if (uploading || uploadingOptions) return setError("Please wait for the photo to finish uploading.");

    const price = Number(form.price);
    if (!form.name.trim()) return setError("Enter a product name.");
    if (!form.price || !Number.isFinite(price) || price <= 0) {
      return setError("Enter a price above \u20A60.");
    }
    if (form.section.trim().length > 40) {
      return setError("Menu section must be 40 characters or fewer.");
    }
    const problem = validateDrafts(groups);
    if (problem) return setError(problem);

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
          optionGroups: toPayload(groups),
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

      <Field label={"Price (\u20A6)"} required>
        <input
          type="number"
          min="0"
          placeholder="4500"
          className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          value={form.price}
          onChange={(e) => update("price", e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-faint">
          This is the price with the normal serving. Extras and bigger portions are added below and are
          charged on top of it.
        </p>
      </Field>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Options and extras</label>
        <OptionGroupsEditor value={groups} onChange={setGroups} onUploadingChange={setUploadingOptions} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || uploading || uploadingOptions}
        className="w-full rounded-xl bg-brand py-3 font-semibold text-brand-ink disabled:opacity-60"
      >
        {uploading || uploadingOptions ? "Uploading photo..." : saving ? "Saving..." : "Save Product"}
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