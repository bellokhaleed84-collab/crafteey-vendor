import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, AuthError } from "@/middleware/auth";
import HubVendor from "@/models/HubVendor";
import { resolveStore } from "@/lib/storeAccess";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const access = await resolveStore(decoded.uid);
    if (!access) return NextResponse.json({ error: "Not part of a store" }, { status: 404 });

    const store = await HubVendor.findById(access.vendorId).select("name isOpen").lean();
    return NextResponse.json({
      role: access.role,
      store: { name: store?.name ?? "Store", isOpen: store?.isOpen ?? false },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("staff me error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}