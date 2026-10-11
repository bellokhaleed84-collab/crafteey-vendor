import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { listBanks } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await verifyToken(req);
    const banks = await listBanks();
    return NextResponse.json({ banks });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor banks GET error", err);
    return NextResponse.json({ error: "Couldn't load the bank list." }, { status: 500 });
  }
}