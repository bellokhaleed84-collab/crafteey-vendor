import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Promotion, { type IPromotion } from "@/models/Promotion";
import HubProduct from "@/models/HubProduct";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";
import { toPromotionDto } from "@/lib/promotions";

const OWNER_ONLY = "Only the store owner can manage promotions.";
const MAX_RUNNING = 20;
const DURATIONS = [0, 1, 3, 7, 30]; // days; 0 = until the owner stops it

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStoreForUser(decoded);
    if (!store) return NextResponse.json({ promotions: [] });
    if (store.role !== "owner") return NextResponse.json({ error: OWNER_ONLY }, { status: 403 });

    const docs = await Promotion.find({ vendorId: store.vendorId }).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ promotions: (docs as unknown as IPromotion[]).map(toPromotionDto) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("promotions GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { type, percent?, amountNaira?, buyQty?, freeQty?, scope, productIds?, days }
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStoreForUser(decoded);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    if (store.role !== "owner") return NextResponse.json({ error: OWNER_ONLY }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

    const type = body.type;
    if (type !== "percent" && type !== "amount" && type !== "buy_get") return bad("Choose a promotion type");

    const doc: Record<string, unknown> = {
      vendorId: store.vendorId,
      type,
      startsAt: new Date(),
      isActive: true,
    };

    if (type === "percent") {
      const n = Number(body.percent);
      if (!Number.isInteger(n) || n < 1 || n > 90) return bad("Percent must be a whole number from 1 to 90");
      doc.percent = n;
    } else if (type === "amount") {
      const n = Number(body.amountNaira);
      if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return bad("Enter how much to take off");
      doc.amountOffKobo = Math.round(n * 100);
    } else {
      const buy = Number(body.buyQty);
      const free = Number(body.freeQty);
      if (!Number.isInteger(buy) || buy < 1 || buy > 20) return bad("Buy quantity must be from 1 to 20");
      if (!Number.isInteger(free) || free < 1 || free > 10) return bad("Free quantity must be from 1 to 10");
      doc.buyQty = buy;
      doc.freeQty = free;
    }

    const scope = body.scope === "all" ? "all" : "products";
    doc.scope = scope;
    if (scope === "products") {
      const raw: unknown[] = Array.isArray(body.productIds) ? body.productIds : [];
      const ids = Array.from(new Set(raw.filter((x): x is string => typeof x === "string")));
      if (ids.length === 0 || ids.length > 50 || ids.some((x) => !mongoose.isValidObjectId(x))) {
        return bad("Choose at least one item");
      }
      const mine = await HubProduct.countDocuments({ _id: { $in: ids }, vendorId: store.vendorId, isActive: true });
      if (mine !== ids.length) return bad("One of the chosen items isn't in your store");
      doc.productIds = ids;
    } else {
      doc.productIds = [];
    }

    const days = Number(body.days ?? 0);
    if (!DURATIONS.includes(days)) return bad("Choose how long the promotion runs");
    doc.endsAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    const running = await Promotion.countDocuments({ vendorId: store.vendorId, isActive: true });
    if (running >= MAX_RUNNING) return bad("You have too many promotions. Stop one first.");

    const created = await Promotion.create(doc);
    return NextResponse.json({ promotion: toPromotionDto(created.toObject() as unknown as IPromotion) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("promotions POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}