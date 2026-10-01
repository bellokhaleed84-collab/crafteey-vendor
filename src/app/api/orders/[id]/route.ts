import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import { verifyToken, AuthError } from "@/middleware/auth";
import { orderStage, toVendorOrder } from "@/lib/hubOrderMapper";
import { rejectOrder } from "@/lib/hub/rejectOrder";
import { resolveStoreForUser } from "@/lib/storeAccess";

type Ctx = { params: { id: string } };

// The store this person works for: the owner's store, or the store they're active staff at.
async function findStore(req: NextRequest, id: string) {
  const decoded = await verifyToken(req);
  await connectToDatabase();
  if (!mongoose.isValidObjectId(id)) return null;
  return resolveStoreForUser(decoded);
}

// Staff don't see what the store earns.
function forRole(role: "owner" | "staff", o: ReturnType<typeof toVendorOrder>) {
  return role === "staff" ? { ...o, vendorPayout: undefined } : o;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const store = await findStore(req, params.id);
    if (!store) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = await HubOrder.findOne({ _id: params.id, vendorId: store.vendorId }).lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json({
      order: forRole(store.role, toVendorOrder(order as unknown as Parameters<typeof toVendorOrder>[0])),
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
    const store = await findStore(req, params.id);
    if (!store) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { action, reason } = await req.json();
    const order = await HubOrder.findOne({ _id: params.id, vendorId: store.vendorId });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Reject is a transaction (cancel + wallet refund + cancel rider job),
    // so it has its own path.
    if (action === "reject") {
      // A second tap on an already-refunded order changes nothing.
      if (order.refund?.status === "refunded") {
        return NextResponse.json({
          order: forRole(
            store.role,
            toVendorOrder(order.toObject() as unknown as Parameters<typeof toVendorOrder>[0])
          ),
        });
      }

      const stage = orderStage(order);
      if (stage !== "new") {
        return NextResponse.json({ error: "This order can't be rejected now." }, { status: 409 });
      }
      if (order.status !== "paid") {
        return NextResponse.json(
          { error: "A rider has already accepted this order, so it can't be rejected here. Contact support." },
          { status: 409 }
        );
      }

      const result = await rejectOrder({
        orderId: params.id,
        vendorId: store.vendorId,
        reason: typeof reason === "string" ? reason : undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      const fresh = await HubOrder.findById(order._id).lean();
      if (!fresh) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      return NextResponse.json({
        order: forRole(store.role, toVendorOrder(fresh as unknown as Parameters<typeof toVendorOrder>[0])),
        refundedKobo: result.refundedKobo,
      });
    }

    const stage = orderStage(order);
    const now = new Date();
    // Guard against races (e.g. the rider updating status at the same moment).
    const base = { _id: order._id, vendorId: store.vendorId, status: order.status };
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
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "This order just changed. Refresh and try again." }, { status: 409 });
    }
    return NextResponse.json({
      order: forRole(
        store.role,
        toVendorOrder(updated.toObject() as unknown as Parameters<typeof toVendorOrder>[0])
      ),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}