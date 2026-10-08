import { NextRequest, NextResponse } from "next/server";
import mongoose, { type UpdateQuery } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct, { type IHubProduct } from "@/models/HubProduct";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { toVendorProduct, nairaToKobo, parseSection } from "@/lib/hubProductMapper";
import { parseOptionGroups } from "@/lib/optionGroups";

async function authorize(req: NextRequest, id: string) {
  const decoded = await verifyToken(req);
  await connectToDatabase();
  if (!mongoose.isValidObjectId(id)) return null;
  return getLinkedHubVendor(decoded.uid);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = await authorize(req, params.id);
    if (!vendor) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const updates = await req.json().catch(() => null);
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};

    if (typeof updates.name === "string" && updates.name.trim()) set.name = updates.name.trim();

    if ("description" in updates) {
      const d = typeof updates.description === "string" ? updates.description.trim() : "";
      if (d) set.description = d;
      else unset.description = "";
    }
    if ("imageUrl" in updates) {
      const u = typeof updates.imageUrl === "string" ? updates.imageUrl.trim() : "";
      if (u) set.imageUrl = u;
      else unset.imageUrl = "";
    }
    if ("section" in updates) {
      const s = parseSection(updates.section);
      if (!s.ok) return NextResponse.json({ error: s.error }, { status: 400 });
      if (s.value) set.section = s.value;
      else unset.section = "";
    }
    if ("variants" in updates && Array.isArray(updates.variants)) set.variants = updates.variants;
    if ("optionGroups" in updates) {
      const groups = parseOptionGroups(updates.optionGroups);
      if (!groups.ok) return NextResponse.json({ error: groups.error }, { status: 400 });
      set.optionGroups = groups.value;
    }
    if ("inStock" in updates) set.isAvailable = Boolean(updates.inStock);
    if ("price" in updates) {
      const kobo = nairaToKobo(updates.price);
      if (kobo === null) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
      set.priceKobo = kobo;
    }

    const update: UpdateQuery<IHubProduct> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const product = await HubProduct.findOneAndUpdate(
      { _id: params.id, vendorId: vendor._id, isActive: true },
      update,
      { new: true }
    ).lean();

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({
      product: toVendorProduct(product as unknown as Parameters<typeof toVendorProduct>[0]),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("product PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Soft delete: hides the product from the Hub but keeps it for past orders.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = await authorize(req, params.id);
    if (!vendor) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const result = await HubProduct.findOneAndUpdate(
      { _id: params.id, vendorId: vendor._id, isActive: true },
      { $set: { isActive: false, isAvailable: false } }
    );
    if (!result) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("product DELETE error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}