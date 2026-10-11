import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { lagosDayString } from "@/lib/lagosTime";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 90;

// Payout per Lagos day for the last 90 days (delivered orders only).
// The page picks the last 7, 30 or 90 of these.
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const now = new Date();
    const keys: string[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      keys.push(lagosDayString(new Date(now.getTime() - i * DAY_MS)));
    }

    const map = new Map<string, { payoutKobo: number; count: number }>();
    const hub = await getLinkedHubVendor(decoded.uid);
    if (hub) {
      const since = new Date(now.getTime() - (DAYS + 1) * DAY_MS);
      const rows = await HubOrder.aggregate<{ _id: string; payoutKobo: number; count: number }>([
        { $match: { vendorId: hub._id, status: "delivered", updatedAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "Africa/Lagos" } },
            payoutKobo: { $sum: "$vendorPayoutKobo" },
            count: { $sum: 1 },
          },
        },
      ]);
      for (const r of rows) map.set(r._id, { payoutKobo: r.payoutKobo, count: r.count });
    }

    const days = keys.map((day) => ({
      day,
      payoutKobo: map.get(day)?.payoutKobo ?? 0,
      count: map.get(day)?.count ?? 0,
    }));

    return NextResponse.json({ days });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("earnings chart error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}