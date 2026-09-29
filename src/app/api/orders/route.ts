import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { toVendorOrder } from "@/lib/hubOrderMapper";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await HubVendor.findOne({ ownerUid: decoded.uid });
    if (!vendor) return NextResponse.json({ orders: [] });

    // Only paid orders. Unpaid checkouts stay hidden; cancelled ones show only if they were paid.
    const docs = await HubOrder.find({
      vendorId: vendor._id,
      $or: [
        { status: { $in: ["paid", "preparing", "out_for_delivery", "delivered"] } },
        { status: "cancelled", "payment.status": "success" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      orders: (docs as unknown as Parameters<typeof toVendorOrder>[0][]).map(toVendorOrder),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("orders GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}