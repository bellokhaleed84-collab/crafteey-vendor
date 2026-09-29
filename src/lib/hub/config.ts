export const HUB_CATEGORIES = ["food", "groceries", "drinks", "marketplace"] as const;
export type HubCategory = (typeof HUB_CATEGORIES)[number];

export const HUB_CATEGORY_LABELS: Record<HubCategory, string> = {
  food: "Food",
  groceries: "Groceries",
  drinks: "Drinks",
  marketplace: "Marketplace",
};

export function isHubCategory(v: unknown): v is HubCategory {
  return typeof v === "string" && (HUB_CATEGORIES as readonly string[]).includes(v);
}

/** Flat delivery fee in kobo (₦1,000). Change it here only. */
export const DELIVERY_FEE_KOBO = 100_000;

export const HUB_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type HubOrderStatus = (typeof HUB_ORDER_STATUSES)[number];

export const HUB_ORDER_STATUS_LABELS: Record<HubOrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  preparing: "Preparing",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}