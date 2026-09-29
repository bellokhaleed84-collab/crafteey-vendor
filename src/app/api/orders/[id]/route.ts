import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { orderStage, toVendorOrder } from "@/lib/hubOrderMapper";

type Ctx = { params: { id: string } };

async function findVendor(req: NextRequest, id: string) {
  const decoded = await verifyToken(req);
  await connectToDatabase();
  if (!mongoose.isValidObjectId(id)) return null;
  return HubVendor.findOne({ ownerUid: decoded.uid });
}

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const vendor = await findVendor(req, params.id);
    if (!vendor) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = await HubOrder.findOne({ _id: params.id, vendorId: vendor._id }).lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json({
      order: toVendorOrder(order as unknown as Parameters<typeof toVendorOrder>[0]),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { action: "accept" | "ready" | "reject", reason?: string }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const vendor = await findVendor(req, params.id);
    if (!vendor) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { action, reason } = await req.json();
    const order = await HubOrder.findOne({ _id: params.id, vendorId: vendor._id });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const stage = orderStage(order);
    const now = new Date();
    // Guard against races (e.g. the rider updating status at the same moment).
    const base = { _id: order._id, vendorId: vendor._id, status: order.status };
    let updated;

    if (action === "accept") {
      if (stage !== "new") {
        return NextResponse.json({ error: "This order can't be accepted now." }, { status: 409 });
      }
      updated = await HubOrder.findOneAndUpdate(
        { ...base, vendorAcceptedAt: { $exists: false } },
        { $set: { vendorAcceptedAt: now, status: order.status === "paid" ? "preparing" : order.status } },
        { new: true }
      );
    } else if (action === "ready") {
      if (stage !== "preparing") {
        return NextResponse.json({ error: "Accept the order first." }, { status: 409 });
      }
      updated = await HubOrder.findOneAndUpdate(
        { ...base, vendorAcceptedAt: { $exists: true }, readyForPickupAt: { $exists: false } },
        { $set: { readyForPickupAt: now } },
        { new: true }
      );
    } else if (action === "reject") {
      if (stage !== "new") {
        return NextResponse.json({ error: "This order can't be rejected now." }, { status: 409 });
      }
      if (order.status !== "paid") {
        return NextResponse.json(
          { error: "A rider has already accepted this order, so it can't be rejected here. Contact support." },
          { status: 409 }
        );
      }
      updated = await HubOrder.findOneAndUpdate(
        { ...base, vendorAcceptedAt: { $exists: false } },
        {
          $set: {
            status: "cancelled",
            cancelledBy: "vendor",
            cancelReason: typeof reason === "string" ? reason.slice(0, 200) : undefined,
          },
        },
        { new: true }
      );
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "This order just changed. Refresh and try again." }, { status: 409 });
    }
    return NextResponse.json({
      order: toVendorOrder(updated.toObject() as unknown as Parameters<typeof toVendorOrder>[0]),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}