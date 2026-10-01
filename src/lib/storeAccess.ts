import type { Types } from "mongoose";
import HubVendor from "@/models/HubVendor";
import VendorStaff from "@/models/VendorStaff";

export type StoreAccess = { vendorId: Types.ObjectId; role: "owner" | "staff" };
export type StoreUser = { uid: string; email?: string; email_verified?: boolean };

/** The store this Firebase user owns, or the store they already work at as active staff. */
export async function resolveStore(uid: string): Promise<StoreAccess | null> {
  const own = await HubVendor.findOne({ ownerUid: uid }).select("_id").lean();
  if (own) return { vendorId: own._id as Types.ObjectId, role: "owner" };

  const staff = await VendorStaff.findOne({ staffUid: uid, status: "active" }).select("hubVendorId").lean();
  if (staff) return { vendorId: staff.hubVendorId as Types.ObjectId, role: "staff" };

  return null;
}

/**
 * Same as resolveStore, but if the person has no store yet and signed in with a
 * VERIFIED email that an owner invited, this activates the invite.
 */
export async function resolveStoreForUser(user: StoreUser): Promise<StoreAccess | null> {
  const existing = await resolveStore(user.uid);
  if (existing) return existing;

  if (!user.email || user.email_verified !== true) return null;

  try {
    const claimed = await VendorStaff.findOneAndUpdate(
      { email: user.email.trim().toLowerCase(), status: "invited" },
      { $set: { status: "active", staffUid: user.uid, joinedAt: new Date() } },
      { new: true }
    )
      .select("hubVendorId")
      .lean();
    if (!claimed) return null;
    return { vendorId: claimed.hubVendorId as Types.ObjectId, role: "staff" };
  } catch (e) {
    // This login is already staff somewhere else.
    if ((e as { code?: number } | null)?.code === 11000) return null;
    throw e;
  }
}