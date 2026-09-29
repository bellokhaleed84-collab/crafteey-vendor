import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { isVendorTier, type VendorTier } from "@/lib/vendorTiers";

// The Hub listing's tier is what customers actually see, so it wins.
// Older vendors may have no Vendor.tier yet.
function resolveTier(hubTier: unknown, vendorTier: unknown): VendorTier {
  if (isVendorTier(hubTier)) return hubTier;
  if (isVendorTier(vendorTier)) return vendorTier;
  return "basic";
}

async function loadState(uid: string) {
  const vendor = await Vendor.findOne({ uid });
  if (!vendor) return null;
  const hub = await HubVendor.findOne({ ownerUid: uid }).select("tier").lean();
  const hubTier = hub?.tier;
  const tier = resolveTier(hubTier, vendor.tier);
  return { vendor, tier };
}

function publicState(tier: VendorTier, tierRequest: any) {
  return {
    tier,
    tierRequest: tierRequest
      ? {
          requestedTier: tierRequest.requestedTier,
          status: tierRequest.status,
          requestedAt: tierRequest.requestedAt,
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const state = await loadState(decoded.uid);
    if (!state) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json(publicState(state.tier, state.vendor.tierRequest));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor tier GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Vendor asks for a tier change. It only records the request; the admin app
// approves or rejects it and updates both Vendor.tier and HubVendor.tier.
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const requestedTier = body?.requestedTier;
    if (!isVendorTier(requestedTier)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const state = await loadState(decoded.uid);
    if (!state) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    const { vendor, tier } = state;

    if (requestedTier === tier) {
      return NextResponse.json({ error: "You're already on this plan." }, { status: 400 });
    }
    if (vendor.tierRequest?.status === "pending") {
      return NextResponse.json(
        { error: "You already have a plan change waiting for review." },
        { status: 409 }
      );
    }

    vendor.tierRequest = {
      requestedTier,
      status: "pending",
      requestedAt: new Date(),
    };
    await vendor.save();

    return NextResponse.json(publicState(tier, vendor.tierRequest), { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor tier POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}