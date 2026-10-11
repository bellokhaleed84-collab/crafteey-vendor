import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct from "@/models/HubProduct";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";

// The owner's items, for the "choose items" list on the new promotion screen.
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStoreForUser(decoded);
    if (!store) return NextResponse.json({ products: [] });
    if (store.role !== "owner") {
      return NextResponse.json({ error: "Only the store owner can manage promotions." }, { status: 403 });
    }

    const docs = await HubProduct.find({ vendorId: store.vendorId, isActive: true })
      .select("name priceKobo")
      .sort({ name: 1 })
      .limit(300)
      .lean<{ _id: unknown; name: string; priceKobo: number }[]>();

    return NextResponse.json({
      products: docs.map((p) => ({ _id: String(p._id), name: p.name, priceKobo: p.priceKobo })),
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("promotion products GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}