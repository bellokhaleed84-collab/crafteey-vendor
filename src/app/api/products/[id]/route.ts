import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct from "@/models/HubProduct";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { toVendorProduct, resolveCategory, nairaToKobo } from "@/lib/hubProductMapper";

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

    const updates = await req.json();
    const patch: Record<string, unknown> = {};

    if (typeof updates.name === "string" && updates.name.trim()) patch.name = updates.name.trim();
    if ("description" in updates) patch.description = updates.description || undefined;
    if ("imageUrl" in updates) patch.imageUrl = updates.imageUrl || undefined;
    if ("category" in updates) patch.category = resolveCategory(updates.category, vendor.categories[0] ?? "food");
    if ("variants" in updates && Array.isArray(updates.variants)) patch.variants = updates.variants;
    if ("inStock" in updates) patch.isAvailable = Boolean(updates.inStock);
    if ("price" in updates) {
      const kobo = nairaToKobo(updates.price);
      if (kobo === null) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
      patch.priceKobo = kobo;
    }

    const product = await HubProduct.findOneAndUpdate(
      { _id: params.id, vendorId: vendor._id, isActive: true },
      { $set: patch },
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