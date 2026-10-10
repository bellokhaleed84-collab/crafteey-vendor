"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { Card } from "@/components/ui/Card";

export interface ChoiceDraft {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  maxQty: string;
}
export interface GroupDraft {
  id: string;
  name: string;
  required: boolean;
  single: boolean;
  choices: ChoiceDraft[];
}

// What the products API sends back (prices in naira).
export interface ApiChoice {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  maxQty: number;
}
export interface ApiGroup {
  id: string;
  name: string;
  required: boolean;
  single: boolean;
  choices: ApiChoice[];
}

function newId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function blankChoice(): ChoiceDraft {
  return { id: newId("c"), name: "", price: "0", imageUrl: "", maxQty: "1" };
}

export function toDrafts(groups: ApiGroup[] | undefined | null): GroupDraft[] {
  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    required: g.required,
    single: g.single,
    choices: g.choices.map((c) => ({
      id: c.id,
      name: c.name,
      price: String(c.price),
      imageUrl: c.imageUrl ?? "",
      maxQty: String(c.maxQty),
    })),
  }));
}

export function toPayload(drafts: GroupDraft[]) {
  return drafts.map((g) => ({
    id: g.id,
    name: g.name.trim(),
    required: g.required,
    single: g.single,
    choices: g.choices.map((c) => ({
      id: c.id,
      name: c.name.trim(),
      price: Number(c.price) || 0,
      imageUrl: c.imageUrl || undefined,
      maxQty: g.single ? 1 : Number(c.maxQty) || 1,
    })),
  }));
}

export function validateDrafts(drafts: GroupDraft[]): string | null {
  for (const g of drafts) {
    if (!g.name.trim()) return "Every option group needs a name, like Portion or Extras.";
    if (g.choices.length === 0) return "\"" + g.name.trim() + "\" needs at least one choice.";
    for (const c of g.choices) {
      if (!c.name.trim()) return "Every choice in \"" + g.name.trim() + "\" needs a name.";
      const price = Number(c.price);
      if (c.price === "" || !Number.isFinite(price) || price < 0) {
        return "Enter a valid price for \"" + c.name.trim() + "\".";
      }
      if (!g.single) {
        const q = Number(c.maxQty);
        if (!Number.isInteger(q) || q < 1 || q > 20) {
          return "\"" + c.name.trim() + "\" can allow between 1 and 20 per plate.";
        }
      }
    }
  }
  return null;
}

const FIELD =
  "rounded-xl border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand";

export default function OptionGroupsEditor({
  value,
  onChange,
  onUploadingChange,
}: {
  value: GroupDraft[];
  onChange: (next: GroupDraft[]) => void;
  onUploadingChange?: (busy: boolean) => void;
}) {
  const uploading = useRef(new Set<string>());
  const [photoOpen, setPhotoOpen] = useState<Record<string, boolean>>({});

  const track = (id: string, busy: boolean) => {
    if (busy) uploading.current.add(id);
    else uploading.current.delete(id);
    onUploadingChange?.(uploading.current.size > 0);
  };

  const patchGroup = (gi: number, patch: Partial<GroupDraft>) =>
    onChange(value.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

  const patchChoice = (gi: number, ci: number, patch: Partial<ChoiceDraft>) =>
    onChange(
      value.map((g, i) =>
        i === gi ? { ...g, choices: g.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : g
      )
    );

  const setSingle = (gi: number, single: boolean) =>
    onChange(
      value.map((g, i) =>
        i === gi
          ? { ...g, single, choices: single ? g.choices.map((c) => ({ ...c, maxQty: "1" })) : g.choices }
          : g
      )
    );

  const addGroup = (kind: "extras" | "must") =>
    onChange([
      ...value,
      {
        id: newId("g"),
        name: kind === "extras" ? "Extras" : "Portion",
        required: kind === "must",
        single: kind === "must",
        choices: [blankChoice()],
      },
    ]);

  const removeGroup = (gi: number) => onChange(value.filter((_, i) => i !== gi));

  const addChoice = (gi: number) =>
    onChange(value.map((g, i) => (i === gi ? { ...g, choices: [...g.choices, blankChoice()] } : g)));

  const removeChoice = (gi: number, ci: number) =>
    onChange(
      value.map((g, i) => (i === gi ? { ...g, choices: g.choices.filter((_, j) => j !== ci) } : g))
    );

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-xs text-ink-faint">
          No options. Customers get this item at the price above. Add extras like beef or plantain, or
          a portion size they must choose.
        </p>
      )}

      {value.map((g, gi) => (
        <Card key={g.id} className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <input
              placeholder="Group name (e.g. Extras, Portion)"
              className={"min-w-0 flex-1 " + FIELD}
              value={g.name}
              maxLength={40}
              onChange={(e) => patchGroup(gi, { name: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              aria-label="Remove group"
              className="flex h-10 w-10 shrink-0 items-center justify-center text-ink-faint"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-ink">
            <label className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#FFC800]"
                checked={g.required}
                onChange={(e) => patchGroup(gi, { required: e.target.checked })}
              />
              Customer must choose
            </label>
            <label className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#FFC800]"
                checked={g.single}
                onChange={(e) => setSingle(gi, e.target.checked)}
              />
              Pick only one
            </label>
          </div>

          <div className="space-y-3">
            {g.choices.map((c, ci) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoOpen((p) => ({ ...p, [c.id]: !p[c.id] }))}
                    aria-label="Choice photo"
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-surface-border text-[10px] font-medium text-ink-faint"
                  >
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "Photo"
                    )}
                  </button>
                  <input
                    placeholder="Name (e.g. Beef)"
                    className={"min-w-0 flex-1 " + FIELD}
                    value={c.name}
                    maxLength={60}
                    onChange={(e) => patchChoice(gi, ci, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={"+\u20A6"}
                    className={"w-20 " + FIELD}
                    value={c.price}
                    onChange={(e) => patchChoice(gi, ci, { price: e.target.value })}
                  />
                  {!g.single && (
                    <input
                      type="number"
                      min="1"
                      max="20"
                      placeholder="Max"
                      aria-label="Most a customer can add per plate"
                      className={"w-16 " + FIELD}
                      value={c.maxQty}
                      onChange={(e) => patchChoice(gi, ci, { maxQty: e.target.value })}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeChoice(gi, ci)}
                    aria-label="Remove choice"
                    className="flex h-10 w-8 shrink-0 items-center justify-center text-ink-faint"
                  >
                    <X size={16} />
                  </button>
                </div>

                {photoOpen[c.id] && (
                  <div className="pl-12">
                    <ImageUpload
                      compact
                      value={c.imageUrl}
                      onChange={(url) => patchChoice(gi, ci, { imageUrl: url })}
                      onUploadingChange={(busy) => track(c.id, busy)}
                    />
                  </div>
                )}
              </div>
            ))}
            <p className="text-[11px] text-ink-faint">
              {g.single
                ? "Price is what the choice adds to the base price. Use 0 for the normal one."
                : "Price is for one. Max is the most a customer can add per plate."}
            </p>
            <button
              type="button"
              onClick={() => addChoice(gi)}
              className="py-1 text-xs font-bold text-brand-dark"
            >
              + Add choice
            </button>
          </div>
        </Card>
      ))}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => addGroup("extras")}
          className="flex items-center gap-1.5 py-2 text-xs font-bold text-brand-dark"
        >
          <Plus size={14} /> Add extras (like beef, plantain)
        </button>
        <button
          type="button"
          onClick={() => addGroup("must")}
          className="flex items-center gap-1.5 py-2 text-xs font-bold text-brand-dark"
        >
          <Plus size={14} /> Add a must-choose option (like portion size)
        </button>
      </div>
    </div>
  );
}