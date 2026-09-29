import HubVendor from "@/models/HubVendor";
import Vendor from "@/models/Vendor";
import type { HubCategory } from "@/lib/hub/config";
import { isVendorApproved } from "@/lib/vendorApproval";

const CATEGORY_MAP: Record<string, HubCategory> = {
  Restaurant: "food",
  Bakery: "food",
  Groceries: "groceries",
  "Provisions Store": "groceries",
  "Drinks & Beverages": "drinks",
  Pharmacy: "marketplace",
  Other: "marketplace",
};

// Returns the vendor's Hub listing, creating it on demand if it doesn't exist yet.
// Returns null only if the vendor profile is missing or not approved
// (isVendorApproved respects NEXT_PUBLIC_REQUIRE_VENDOR_APPROVAL).
export async function getLinkedHubVendor(uid: string) {
  const existing = await HubVendor.findOne({ ownerUid: uid, isActive: true });
  if (existing) return existing;

  const vendor = await Vendor.findOne({ uid });
  if (!vendor || !isVendorApproved(vendor)) return null;

  try {
    return await HubVendor.create({
      ownerUid: uid,
      name: vendor.businessName,
      categories: [CATEGORY_MAP[vendor.category] ?? "marketplace"],
      address: vendor.address || undefined,
      isOpen: Boolean(vendor.isOpen),
      isActive: true,
      isSeed: false,
      tier: "basic",
    });
  } catch {
    // Duplicate key: another request created it at the same moment.
    return HubVendor.findOne({ ownerUid: uid, isActive: true });
  }
}