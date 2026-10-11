import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct from "@/models/HubProduct";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { toVendorProduct, nairaToKobo, parseSection, parseStock } from "@/lib/hubProductMapper";
import { parseOptionGroups } from "@/lib/optionGroups";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await getLinkedHubVendor(decoded.uid);
    if (!vendor) return NextResponse.json({ products: [] });

    // Foods saved before the fix used the field "section", which the client app never read.
    // Copy it to "menuSection" (adds a field, deletes nothing). Does nothing once done.
    try {
      await HubProduct.updateMany(
        {
          vendorId: vendor._id,
          section: { $exists: true, $nin: ["", null] },
          menuSection: { $exists: false },
        },
        [{ $set: { menuSection: "$section" } }]
      );
    } catch (e) {
      console.error("menuSection copy failed", e);
    }

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

    const stock = parseStock(body.stock);
    if (!stock.ok) return NextResponse.json({ error: stock.error }, { status: 400 });

    const groups = parseOptionGroups(body.optionGroups);
    if (!groups.ok) return NextResponse.json({ error: groups.error }, { status: 400 });

    const product = await HubProduct.create({
      vendorId: vendor._id,
      // The Hub category always follows the store's own category.
      category: vendor.categories[0] ?? "food",
      menuSection: section.value || undefined,
      name,
      description: body.description || undefined,
      imageUrl: body.imageUrl || undefined,
      priceKobo,
      stock: stock.value,
      variants: Array.isArray(body.variants) ? body.variants : [],
      optionGroups: groups.value,
      // A quantity of 0 means sold out from the start.
      isAvailable: body.inStock !== false && stock.value !== 0,
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