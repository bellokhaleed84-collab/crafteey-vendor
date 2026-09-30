import { isHubCategory, type HubCategory } from "@/lib/hub/config";
import type { IHubProduct } from "@/models/HubProduct";

type ProductDoc = IHubProduct & { _id: unknown; createdAt?: Date };

// HubProduct -> the shape the vendor pages already expect
export function toVendorProduct(p: ProductDoc) {
  return {
    _id: String(p._id),
    name: p.name,
    description: p.description ?? "",
    imageUrl: p.imageUrl ?? "",
    category: p.category,
    section: p.section ?? "",
    price: p.priceKobo / 100,
    inStock: p.isAvailable,
    variants: p.variants ?? [],
    createdAt: p.createdAt,
  };
}

export function resolveCategory(input: unknown, fallback: HubCategory): HubCategory {
  return isHubCategory(input) ? input : fallback;
}

export function nairaToKobo(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

const MAX_SECTION_LENGTH = 40;

// Menu section is optional. "" (or null/undefined) means "no section".
export function parseSection(
  input: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, value: "" };
  if (typeof input !== "string") return { ok: false, error: "Invalid menu section" };
  const value = input.trim().replace(/\s+/g, " ");
  if (value.length > MAX_SECTION_LENGTH) {
    return { ok: false, error: `Menu section must be ${MAX_SECTION_LENGTH} characters or fewer.` };
  }
  return { ok: true, value };
}