import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";

const KEYS = ["newOrders", "promotions", "system"] as const;

type Prefs = { newOrders: boolean; promotions: boolean; system: boolean };

function withDefaults(raw: Partial<Prefs> | null | undefined): Prefs {
  return {
    newOrders: raw?.newOrders !== false,
    promotions: raw?.promotions !== false,
    system: raw?.system !== false,
  };
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await Vendor.findOne({ uid: decoded.uid })
      .select("notificationPrefs")
      .lean<{ notificationPrefs?: Partial<Prefs> } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json({ prefs: withDefaults(vendor.notificationPrefs) });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("notification-settings GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { newOrders?: boolean, promotions?: boolean, system?: boolean }
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const set: Record<string, boolean> = {};
    for (const k of KEYS) {
      if (k in body) {
        if (typeof body[k] !== "boolean") {
          return NextResponse.json({ error: "Each setting must be on or off." }, { status: 400 });
        }
        set[`notificationPrefs.${k}`] = body[k];
      }
    }
    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const vendor = await Vendor.findOneAndUpdate({ uid: decoded.uid }, { $set: set }, { new: true })
      .select("notificationPrefs")
      .lean<{ notificationPrefs?: Partial<Prefs> } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json({ prefs: withDefaults(vendor.notificationPrefs) });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("notification-settings POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}