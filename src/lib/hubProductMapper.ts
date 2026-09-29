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