import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { isVendorApproved } from "@/lib/vendorApproval";
import { getLinkedHubVendor } from "@/lib/hubVendor";

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

    // Finds the existing Hub listing or creates it (tier and logo copied
    // from the vendor profile).
    const hubVendor = await getLinkedHubVendor(decoded.uid);
    if (!hubVendor) {
      return NextResponse.json(
        { error: "Your Hub listing is inactive. Contact support." },
        { status: 409 }
      );
    }

    return NextResponse.json({ hubVendor });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("hub-link POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}