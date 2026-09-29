import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order, { OrderStatus } from "@/models/Order";
import { verifyToken, AuthError } from "@/middleware/auth";

// Valid forward transitions a vendor is allowed to make.
// (picked_up / delivered are set by the courier/rider side, not the vendor.)
const VENDOR_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"]
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json();
    const { status, rejectionReason, prepTimeMinutes } = body as {
      status: OrderStatus;
      rejectionReason?: string;
      prepTimeMinutes?: number;
    };

    const order = await Order.findOne({ _id: params.id, vendorUid: decoded.uid });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allowedNext = VENDOR_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return NextResponse.json(
        { error: `Cannot move order from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    order.status = status;
    if (status === "rejected") order.rejectionReason = rejectionReason;
    if (status === "accepted") {
      order.acceptedAt = new Date();
      if (prepTimeMinutes) order.prepTimeMinutes = prepTimeMinutes;
    }
    if (status === "ready_for_pickup") order.readyAt = new Date();

    await order.save();

    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
