import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct from "@/models/HubProduct";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { toVendorProduct, nairaToKobo, parseSection } from "@/lib/hubProductMapper";
import { parseOptionGroups } from "@/lib/optionGroups";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await getLinkedHubVendor(decoded.uid);
    if (!vendor) return NextResponse.json({ products: [] });

    const docs = await HubProduct.find({ vendorId: vendor._id, isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      products: (docs as unknown as Parameters<typeof toVendorProduct>[0][]).map(toVendorProduct),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("products GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await getLinkedHubVendor(decoded.uid);
    if (!vendor) {
      return NextResponse.json(
        { error: "Your store isn't live on the Hub yet. It must be approved first." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const priceKobo = nairaToKobo(body.price);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (priceKobo === null) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });

    const section = parseSection(body.section);
    if (!section.ok) return NextResponse.json({ error: section.error }, { status: 400 });

    const groups = parseOptionGroups(body.optionGroups);
    if (!groups.ok) return NextResponse.json({ error: groups.error }, { status: 400 });

    const product = await HubProduct.create({
      vendorId: vendor._id,
      // The Hub category always follows the store's own category.
      category: vendor.categories[0] ?? "food",
      section: section.value || undefined,
      name,
      description: body.description || undefined,
      imageUrl: body.imageUrl || undefined,
      priceKobo,
      variants: Array.isArray(body.variants) ? body.variants : [],
      optionGroups: groups.value,
      isAvailable: body.inStock !== false,
      isActive: true,
      isSeed: false,
    });

    return NextResponse.json({ product: toVendorProduct(product.toObject()) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("products POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}