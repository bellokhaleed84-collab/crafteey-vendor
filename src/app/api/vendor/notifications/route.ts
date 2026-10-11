import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import Vendor from "@/models/Vendor";
import VendorNotification from "@/models/VendorNotification";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { orderStage } from "@/lib/hubOrderMapper";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const SHOWN_STATUSES = ["paid", "preparing", "out_for_delivery", "delivered", "cancelled"];

type Prefs = { newOrders?: boolean; promotions?: boolean; system?: boolean };

interface Item {
  id: string;
  type: "orders" | "promotions" | "system";
  title: string;
  body: string;
  link: string;
  createdAt: Date;
  read: boolean;
}

function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

// Owner only: staff have no Vendor record, so they get "Vendor not found".
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await Vendor.findOne({ uid: decoded.uid })
      .select("notificationPrefs notificationsSeenAt")
      .lean<{ notificationPrefs?: Prefs; notificationsSeenAt?: Date } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const seenAt = vendor.notificationsSeenAt ? new Date(vendor.notificationsSeenAt) : new Date(0);
    const prefs = vendor.notificationPrefs ?? {};
    const items: Item[] = [];

    const hub = await getLinkedHubVendor(decoded.uid);
    if (hub) {
      const since = new Date(Date.now() - 30 * DAY_MS);
      const orders = await HubOrder.find({
        vendorId: hub._id,
        status: { $in: SHOWN_STATUSES },
        updatedAt: { $gte: since },
      })
        .sort({ updatedAt: -1 })
        .limit(40)
        .select("orderNumber status vendorAcceptedAt readyForPickupAt subtotalKobo vendorPayoutKobo updatedAt")
        .lean();

      for (const o of orders) {
        const stage = orderStage(o);
        const no = o.orderNumber ?? String(o._id).slice(-6).toUpperCase();
        let title = "Order #" + no;
        let body = "";
        if (stage === "new") {
          title = "New order #" + no;
          body = naira(o.subtotalKobo) + " is waiting for you to accept.";
        } else if (stage === "preparing") {
          title = "Order #" + no + " accepted";
          body = "You are preparing this order.";
        } else if (stage === "ready") {
          title = "Order #" + no + " is ready";
          body = "Waiting for a rider to pick it up.";
        } else if (stage === "picked_up") {
          title = "Order #" + no + " picked up";
          body = "A rider is delivering it.";
        } else if (stage === "delivered") {
          title = "Order #" + no + " delivered";
          body = "You earned " + naira(o.vendorPayoutKobo) + ".";
        } else {
          title = "Order #" + no + " cancelled";
          body = "This order was cancelled.";
        }
        items.push({
          id: "o-" + String(o._id),
          type: "orders",
          title,
          body,
          link: "/dashboard/orders/" + String(o._id),
          createdAt: o.updatedAt,
          read: new Date(o.updatedAt) <= seenAt,
        });
      }
    }

    const stored = await VendorNotification.find({ vendorUid: decoded.uid })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();
    for (const n of stored as any[]) {
      if (n.type === "promotions" && prefs.promotions === false) continue;
      if (n.type === "system" && prefs.system === false) continue;
      items.push({
        id: "n-" + String(n._id),
        type: n.type,
        title: n.title,
        body: n.body ?? "",
        link: n.link ?? "",
        createdAt: n.createdAt,
        read: new Date(n.createdAt) <= seenAt,
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unreadCount = items.filter((i) => !i.read).length;

    if (req.nextUrl.searchParams.get("countOnly")) {
      return NextResponse.json({ unreadCount });
    }
    return NextResponse.json({ notifications: items.slice(0, 60), unreadCount });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor notifications GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Marks everything as read.
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await Vendor.findOneAndUpdate(
      { uid: decoded.uid },
      { $set: { notificationsSeenAt: new Date() } }
    ).select("uid");
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor notifications POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}