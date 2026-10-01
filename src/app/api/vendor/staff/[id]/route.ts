import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, AuthError } from "@/middleware/auth";
import VendorStaff from "@/models/VendorStaff";
import { resolveStore } from "@/lib/storeAccess";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    const store = await resolveStore(decoded.uid);
    if (!store || store.role !== "owner") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const row = await VendorStaff.findOne({ _id: params.id, hubVendorId: store.vendorId }).select("_id");
    if (!row) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    // Removing frees their login and email, so they lose access immediately.
    await VendorStaff.updateOne(
      { _id: row._id },
      { $set: { status: "removed" }, $unset: { staffUid: "", email: "" } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("staff DELETE error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}