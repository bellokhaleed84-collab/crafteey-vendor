import { isVendorApproved } from "@/lib/vendorApproval";

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

export interface VendorProfile {
  _id: string;
  uid: string;
  businessName: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  status: VendorStatus;
  isApproved: boolean;
  isOpen: boolean;
}

// Returns null when the signed-in account has no vendor profile yet.
export async function fetchMyVendor(token: string): Promise<VendorProfile | null> {
  const res = await fetch("/api/vendor/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Couldn't load your vendor profile.");
  const data = await res.json();
  return data.vendor as VendorProfile;
}

export function routeForVendor(
  vendor: Pick<VendorProfile, "isApproved" | "status">
): string {
  return isVendorApproved(vendor) ? "/dashboard" : "/pending";
}