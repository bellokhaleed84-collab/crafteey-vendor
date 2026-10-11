import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import ClientContact from "@/models/ClientContact";
import { verifyToken, AuthError } from "@/middleware/auth";
import { resolveStoreForUser } from "@/lib/storeAccess";

export const dynamic = "force-dynamic";

// People who have had a delivered order from this store: name, phone, how many
// orders and how much they spent. The delivery address is never returned. Owner only.
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStoreForUser(decoded);
    if (!store || store.role !== "owner") {
      return NextResponse.json({ error: "Only the store owner can see this." }, { status: 403 });
    }

    const rows = await HubOrder.aggregate<{
      _id: string;
      orders: number;
      spentKobo: number;
      lastOrderAt: Date;
      phone?: string;
    }>([
      { $match: { vendorId: store.vendorId, status: "delivered" } },
      { $sort: { updatedAt: 1 } },
      {
        $group: {
          _id: "$firebaseUid",
          orders: { $sum: 1 },
          spentKobo: { $sum: "$subtotalKobo" },
          lastOrderAt: { $max: "$updatedAt" },
          phone: { $last: "$delivery.phone" },
        },
      },
      { $sort: { lastOrderAt: -1 } },
      { $limit: 200 },
    ]);

    const contacts = await ClientContact.find({ firebaseUid: { $in: rows.map((r) => r._id) } })
      .select("firebaseUid name phone")
      .lean<{ firebaseUid: string; name?: string; phone?: string }[]>();
    const byUid = new Map(contacts.map((c) => [c.firebaseUid, c]));

    return NextResponse.json({
      customers: rows.map((r) => {
        const c = byUid.get(r._id);
        return {
          name: (c?.name ?? "").trim() || "Customer",
          phone: (r.phone ?? "").trim() || (c?.phone ?? "").trim(),
          orders: r.orders,
          spentKobo: r.spentKobo,
          lastOrderAt: r.lastOrderAt,
        };
      }),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("customers GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}