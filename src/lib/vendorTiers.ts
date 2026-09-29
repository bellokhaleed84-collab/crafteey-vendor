export type VendorTier = "basic" | "regular" | "premium";

export const VENDOR_TIERS: readonly VendorTier[] = ["basic", "regular", "premium"];

export function isVendorTier(value: unknown): value is VendorTier {
  return typeof value === "string" && (VENDOR_TIERS as readonly string[]).includes(value);
}

// Display copy. The percentages and visibility must match
// crafteey-client/lib/pricing/vendorCommission.ts (source of truth for payouts).
export const TIER_INFO: Record<
  VendorTier,
  { label: string; commissionPercent: number; visibility: string }
> = {
  basic: {
    label: "Basic",
    commissionPercent: 15,
    visibility: "Lowest commission. Your store is only found through search, and is not listed when customers browse a category.",
  },
  regular: {
    label: "Regular",
    commissionPercent: 20,
    visibility: "Your store is listed when customers browse its category.",
  },
  premium: {
    label: "Premium",
    commissionPercent: 30,
    visibility: "Featured placement: shown first in your category, with high visibility.",
  },
};