import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Promotion, { type IPromotion } from "@/models/Promotion";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";
import { toPromotionDto } from "@/lib/promotions";

// Body: { isActive: boolean }. Stops or starts again one of THIS store's promotions.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }
    const store = await resolveStoreForUser(decoded);
    if (!store) return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    if (store.role !== "owner") {
      return NextResponse.json({ error: "Only the store owner can manage promotions." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updated = await Promotion.findOneAndUpdate(
      { _id: params.id, vendorId: store.vendorId },
      { $set: { isActive: body.isActive } },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ error: "Promotion not found" }, { status: 404 });

    return NextResponse.json({ promotion: toPromotionDto(updated as unknown as IPromotion) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("promotion PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}