import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyToken, AuthError } from "@/middleware/auth";

// GET: list this vendor's orders (optionally filter by status)
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get("status");
    const query: Record<string, unknown> = { vendorUid: decoded.uid };
    if (status) query.status = status;

    const orders = await Order.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ orders });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("orders GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
