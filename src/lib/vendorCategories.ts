export const VENDOR_CATEGORIES = [
  "Restaurant",
  "Groceries",
  "Pharmacy",
  "Bakery",
  "Drinks & Beverages",
  "Provisions Store",
  "Other",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];