import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    const { token } = await req.json();
    if (typeof token !== "string" || token.length < 20) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    await connectToDatabase();
    // A device belongs to one vendor: remove it from others first (shared phones, re-logins)
    await HubVendor.updateMany({ ownerUid: { $ne: decoded.uid } }, { $pull: { pushTokens: token } });
    await HubVendor.updateOne({ ownerUid: decoded.uid }, { $addToSet: { pushTokens: token } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("push-token error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}