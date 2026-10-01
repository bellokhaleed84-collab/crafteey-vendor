import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import { verifyToken, AuthError } from "@/middleware/auth";
import { toVendorOrder } from "@/lib/hubOrderMapper";
import { resolveStoreForUser } from "@/lib/storeAccess";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    // The owner's store, or the store this person works at as staff.
    const store = await resolveStoreForUser(decoded);
    if (!store) return NextResponse.json({ orders: [] });

    // Only paid orders. Unpaid checkouts stay hidden; cancelled ones show only if they were paid.
    const docs = await HubOrder.find({
      vendorId: store.vendorId,
      $or: [
        { status: { $in: ["paid", "preparing", "out_for_delivery", "delivered"] } },
        { status: "cancelled", "payment.status": "success" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const orders = (docs as unknown as Parameters<typeof toVendorOrder>[0][]).map(toVendorOrder);

    // Staff don't see what the store earns.
    return NextResponse.json({
      orders: store.role === "staff" ? orders.map((o) => ({ ...o, vendorPayout: undefined })) : orders,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("orders GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}