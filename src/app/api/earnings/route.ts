import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";

// Nigeria is UTC+1 all year (no daylight saving), so "today" and "this week"
// are measured in Lagos time rather than the server's UTC.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function lagosStartOfDay(now: Date): Date {
  const shifted = new Date(now.getTime() + LAGOS_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - LAGOS_OFFSET_MS);
}

// Weeks start on Monday.
function lagosStartOfWeek(now: Date): Date {
  const dow = new Date(now.getTime() + LAGOS_OFFSET_MS).getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  return new Date(lagosStartOfDay(now).getTime() - sinceMonday * DAY_MS);
}

// Cancelled orders (including vendor-rejected ones, refunded manually) and
// unpaid orders are never counted.
const COUNTED_STATUSES = ["paid", "preparing", "out_for_delivery", "delivered"];

interface Totals {
  earnedPayoutKobo: number;
  earnedSalesKobo: number;
  earnedCommissionKobo: number;
  earnedCount: number;
  pendingPayoutKobo: number;
  pendingCount: number;
  todayPayoutKobo: number;
  todayCount: number;
  weekPayoutKobo: number;
  weekCount: number;
}

const EMPTY_TOTALS: Totals = {
  earnedPayoutKobo: 0,
  earnedSalesKobo: 0,
  earnedCommissionKobo: 0,
  earnedCount: 0,
  pendingPayoutKobo: 0,
  pendingCount: 0,
  todayPayoutKobo: 0,
  todayCount: 0,
  weekPayoutKobo: 0,
  weekCount: 0,
};

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await getLinkedHubVendor(decoded.uid);
    if (!vendor) {
      return NextResponse.json({ tier: null, totals: EMPTY_TOTALS, history: [] });
    }

    const now = new Date();
    const todayStart = lagosStartOfDay(now);
    const weekStart = lagosStartOfWeek(now);

    const isDelivered = { $eq: ["$status", "delivered"] };
    const deliveredSince = (d: Date) => ({ $and: [isDelivered, { $gte: ["$updatedAt", d] }] });

    const [totals] = await HubOrder.aggregate<Totals>([
      { $match: { vendorId: vendor._id, status: { $in: COUNTED_STATUSES } } },
      {
        $group: {
          _id: null,
          earnedPayoutKobo: { $sum: { $cond: [isDelivered, "$vendorPayoutKobo", 0] } },
          earnedSalesKobo: { $sum: { $cond: [isDelivered, "$subtotalKobo", 0] } },
          earnedCommissionKobo: { $sum: { $cond: [isDelivered, "$platformVendorRevenueKobo", 0] } },
          earnedCount: { $sum: { $cond: [isDelivered, 1, 0] } },
          // Paid orders still being prepared or delivered.
          pendingPayoutKobo: { $sum: { $cond: [isDelivered, 0, "$vendorPayoutKobo"] } },
          pendingCount: { $sum: { $cond: [isDelivered, 0, 1] } },
          todayPayoutKobo: { $sum: { $cond: [deliveredSince(todayStart), "$vendorPayoutKobo", 0] } },
          todayCount: { $sum: { $cond: [deliveredSince(todayStart), 1, 0] } },
          weekPayoutKobo: { $sum: { $cond: [deliveredSince(weekStart), "$vendorPayoutKobo", 0] } },
          weekCount: { $sum: { $cond: [deliveredSince(weekStart), 1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]);

    const history = await HubOrder.find({ vendorId: vendor._id, status: "delivered" })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select("orderNumber subtotalKobo vendorPayoutKobo platformVendorRevenueKobo updatedAt")
      .lean();

    return NextResponse.json({
      tier: vendor.tier,
      totals: totals ?? EMPTY_TOTALS,
      history: history.map((o) => ({
        _id: String(o._id),
        orderNumber: o.orderNumber,
        // updatedAt is when the order last changed, which for a delivered
        // order is when it was delivered.
        deliveredAt: o.updatedAt,
        subtotalKobo: o.subtotalKobo,
        payoutKobo: o.vendorPayoutKobo,
        commissionKobo: o.platformVendorRevenueKobo,
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("earnings GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}