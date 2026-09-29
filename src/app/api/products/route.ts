import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/Product";
import { verifyToken, AuthError } from "@/middleware/auth";

// GET: list this vendor's products
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const products = await Product.find({ vendorUid: decoded.uid }).sort({
      createdAt: -1
    });

    return NextResponse.json({ products });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("products GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: create a new product
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json();
    const { name, price, category, description, imageUrl, variants } = body;

    if (!name || price === undefined || !category) {
      return NextResponse.json(
        { error: "name, price and category are required" },
        { status: 400 }
      );
    }

    const product = await Product.create({
      vendorUid: decoded.uid,
      name,
      price,
      category,
      description,
      imageUrl,
      variants: variants || [],
      inStock: true
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("products POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
