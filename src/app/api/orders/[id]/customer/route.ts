import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import ClientContact from "@/models/ClientContact";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";

type Ctx = { params: { id: string } };

// Returns the customer's name and phone for one of THIS store's active orders.
// The delivery address is never returned. Delivered and cancelled orders return null.
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const store = await resolveStoreForUser(decoded);
    if (!store) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = await HubOrder.findOne({ _id: params.id, vendorId: store.vendorId })
      .select("firebaseUid status delivery.phone")
      .lean<{ firebaseUid?: string; status?: string; delivery?: { phone?: string } } | null>();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.status === "cancelled" || order.status === "delivered") {
      return NextResponse.json({ customer: null });
    }

    const client = order.firebaseUid
      ? await ClientContact.findOne({ firebaseUid: order.firebaseUid })
          .select("name phone")
          .lean<{ name?: string; phone?: string } | null>()
      : null;

    const name = (client?.name ?? "").trim() || "Customer";
    const phone = (order.delivery?.phone ?? "").trim() || (client?.phone ?? "").trim();

    return NextResponse.json({ customer: { name, phone } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order customer GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}