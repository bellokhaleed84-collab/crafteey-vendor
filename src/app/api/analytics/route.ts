import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";
import { lagosDayString } from "@/lib/lagosTime";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Sales, top items and the promotion report for the last 7, 30 or 90 days.
// Only delivered orders count. Amounts are after promotions. Owner only.
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStoreForUser(decoded);
    if (!store || store.role !== "owner") {
      return NextResponse.json({ error: "Only the store owner can see this." }, { status: 403 });
    }

    const asked = Number(req.nextUrl.searchParams.get("days"));
    const days = asked === 7 || asked === 90 ? asked : 30;

    const now = new Date();
    const since = new Date(now.getTime() - (days + 1) * DAY_MS);
    const match = { vendorId: store.vendorId, status: "delivered", updatedAt: { $gte: since } };

    const [daily, topItems, promos] = await Promise.all([
      HubOrder.aggregate<{ _id: string; salesKobo: number; count: number; discountKobo: number }>([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "Africa/Lagos" } },
            salesKobo: { $sum: "$subtotalKobo" },
            count: { $sum: 1 },
            discountKobo: { $sum: { $ifNull: ["$discountKobo", 0] } },
          },
        },
      ]),
      HubOrder.aggregate<{ _id: string; quantity: number; salesKobo: number }>([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            quantity: { $sum: "$items.quantity" },
            salesKobo: {
              $sum: {
                $subtract: [
                  { $multiply: ["$items.unitPriceKobo", "$items.quantity"] },
                  { $ifNull: ["$items.discountKobo", 0] },
                ],
              },
            },
          },
        },
        { $sort: { quantity: -1, salesKobo: -1 } },
        { $limit: 10 },
      ]),
      HubOrder.aggregate<{ _id: string; discountKobo: number; orders: number }>([
        { $match: match },
        { $unwind: "$items" },
        { $match: { "items.promoLabel": { $nin: [null, ""] }, "items.discountKobo": { $gt: 0 } } },
        {
          $group: {
            _id: "$items.promoLabel",
            discountKobo: { $sum: "$items.discountKobo" },
            orders: { $addToSet: "$_id" },
          },
        },
        { $project: { discountKobo: 1, orders: { $size: "$orders" } } },
        { $sort: { discountKobo: -1 } },
      ]),
    ]);

    const byDay = new Map(daily.map((d) => [d._id, d]));
    const series: { day: string; salesKobo: number; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = lagosDayString(new Date(now.getTime() - i * DAY_MS));
      const row = byDay.get(day);
      series.push({ day, salesKobo: row?.salesKobo ?? 0, count: row?.count ?? 0 });
    }

    // Totals only cover the days shown.
    const shown = new Set(series.map((s) => s.day));
    let salesKobo = 0;
    let orders = 0;
    let discountKobo = 0;
    for (const d of daily) {
      if (!shown.has(d._id)) continue;
      salesKobo += d.salesKobo;
      orders += d.count;
      discountKobo += d.discountKobo;
    }

    return NextResponse.json({
      days: series,
      totals: { salesKobo, orders, discountKobo },
      topItems: topItems.map((t) => ({ name: t._id, quantity: t.quantity, salesKobo: t.salesKobo })),
      promos: promos.map((p) => ({ label: p._id, orders: p.orders, discountKobo: p.discountKobo })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("analytics GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}