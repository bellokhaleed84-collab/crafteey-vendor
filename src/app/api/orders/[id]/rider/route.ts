import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import CourierRequest from "@/models/CourierRequest";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";

type Ctx = { params: { id: string } };

// Rider is only "assigned" while the job is accepted or in progress.
const ACTIVE = ["accepted", "picked_up", "en_route"];

// Returns the rider's first name and phone for one of THIS store's orders.
// Customer details are never returned.
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
      .select("_id")
      .lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const job = await CourierRequest.findOne({ hubOrderId: String(order._id) })
      .select("status courierUid courierName courierPhone")
      .lean<{
        status?: string;
        courierUid?: string | null;
        courierName?: string | null;
        courierPhone?: string | null;
      } | null>();

    if (!job || !job.courierUid || !job.status || !ACTIVE.includes(job.status)) {
      return NextResponse.json({ rider: null });
    }

    const firstName = (job.courierName ?? "").trim().split(/\s+/)[0] || "Your rider";
    return NextResponse.json({
      rider: { firstName, phone: job.courierPhone ?? "", status: job.status },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order rider GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}