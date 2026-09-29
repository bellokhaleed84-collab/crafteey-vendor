import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { isVendorApproved } from "@/lib/vendorApproval";

// Maps this app's vendor category to a Hub category. Placeholder mapping —
// replace once the real VENDOR_CATEGORIES list is confirmed. Anything
// unrecognized falls back to "marketplace" rather than failing silently
// on a wrong guess.
const CATEGORY_MAP: Record<string, "food" | "groceries" | "drinks" | "marketplace"> = {
  restaurant: "food",
  grocery: "groceries",
  supermarket: "groceries",
  bakery: "food",
  retail: "marketplace",
};

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await Vendor.findOne({ uid: decoded.uid });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    if (!isVendorApproved(vendor)) {
      return NextResponse.json({ error: "Vendor is not approved yet" }, { status: 403 });
    }

    const existing = await HubVendor.findOne({ ownerUid: decoded.uid });
    if (existing) {
      return NextResponse.json({ hubVendor: existing });
    }

    const category = CATEGORY_MAP[vendor.category] ?? "marketplace";

    const hubVendor = await HubVendor.create({
      ownerUid: decoded.uid,
      name: vendor.businessName,
      categories: [category],
      description: vendor.description,
      address: vendor.address,
      isOpen: vendor.isOpen,
      isActive: true,
      isSeed: false,
      tier: "basic", // no tier-selection UI exists yet — every vendor starts Basic
    });

    return NextResponse.json({ hubVendor }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("hub-link POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}