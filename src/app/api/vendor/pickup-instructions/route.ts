import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";

export const dynamic = "force-dynamic";

const MAX_LEN = 200;

// Owner only: staff have no Vendor record, so they get "Vendor not found".
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await Vendor.findOne({ uid: decoded.uid })
      .select("pickupInstructions")
      .lean<{ pickupInstructions?: string } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json({ text: vendor.pickupInstructions ?? "" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("pickup-instructions GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { text: string }. Empty text removes the note.
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const raw = typeof body?.text === "string" ? body.text : "";
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.length > MAX_LEN) {
      return NextResponse.json({ error: `Keep it under ${MAX_LEN} characters.` }, { status: 400 });
    }

    const exists = await Vendor.exists({ uid: decoded.uid });
    if (!exists) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const update = text ? { $set: { pickupInstructions: text } } : { $unset: { pickupInstructions: "" } };
    await Vendor.updateOne({ uid: decoded.uid }, update);
    // updateOne (not getLinkedHubVendor) so this never creates a Hub listing.
    // A vendor with no listing yet simply has the note on the vendor profile.
    await HubVendor.updateOne({ ownerUid: decoded.uid }, update);

    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("pickup-instructions POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}