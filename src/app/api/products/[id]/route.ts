import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/Product";
import { verifyToken, AuthError } from "@/middleware/auth";

// PATCH: update a product (edit details or toggle inStock)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const updates = await req.json();
    const allowed = [
      "name",
      "price",
      "description",
      "imageUrl",
      "category",
      "variants",
      "inStock",
      "availableFrom",
      "availableTo"
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key];
    }

    const product = await Product.findOneAndUpdate(
      { _id: params.id, vendorUid: decoded.uid },
      { $set: patch },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("product PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: remove a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const result = await Product.findOneAndDelete({
      _id: params.id,
      vendorUid: decoded.uid
    });

    if (!result) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("product DELETE error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
