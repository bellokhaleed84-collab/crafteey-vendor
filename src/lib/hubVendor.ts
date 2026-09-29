import HubVendor from "@/models/HubVendor";

// The vendor's Hub listing, linked by Firebase uid. Null until hub-link has run
// (which only happens for approved vendors).
export async function getLinkedHubVendor(uid: string) {
  return HubVendor.findOne({ ownerUid: uid, isActive: true });
}