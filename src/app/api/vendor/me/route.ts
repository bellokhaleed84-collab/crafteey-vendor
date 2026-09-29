import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { VENDOR_CATEGORIES } from "@/lib/vendorCategories";
import { isVendorApproved } from "@/lib/vendorApproval";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await Vendor.findOne({ uid: decoded.uid });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor me GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const updates = await req.json().catch(() => null);
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const existing = await Vendor.findOne({ uid: decoded.uid });
    if (!existing) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Only allow editable fields to change via this route
    const allowed = [
      "businessName",
      "category",
      "phone",
      "address",
      "logoUrl",
      "coverImageUrl",
      "description",
      "businessHours",
      "bankDetails",
      "isOpen",
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key];
    }

    if (typeof patch.businessName === "string") {
      patch.businessName = patch.businessName.trim();
      if (!patch.businessName) {
        return NextResponse.json({ error: "Business name can't be empty" }, { status: 400 });
      }
    }

    if ("category" in patch && !(VENDOR_CATEGORIES as readonly string[]).includes(String(patch.category))) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if ("phone" in patch) {
      const phone = String(patch.phone ?? "").replace(/[\s-]/g, "");
      if (!/^\+?\d{10,15}$/.test(phone)) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }
      patch.phone = phone;
    }

    if ("isOpen" in patch) {
      if (typeof patch.isOpen !== "boolean") {
        return NextResponse.json({ error: "isOpen must be true or false" }, { status: 400 });
      }
      // Only approved stores can go live.
      if (patch.isOpen && !isVendorApproved(existing)) {
        return NextResponse.json(
          { error: "Your store must be approved before it can open." },
          { status: 403 }
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const vendor = await Vendor.findOneAndUpdate(
      { uid: decoded.uid },
      { $set: patch },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ vendor });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor me PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}