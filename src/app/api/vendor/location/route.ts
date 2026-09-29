import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { geocodeAddress, isPlausibleNigeriaCoord } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const hv = await getLinkedHubVendor(decoded.uid);
    if (!hv) return NextResponse.json({ address: "", lat: null, lng: null });
    return NextResponse.json({
      address: hv.address ?? "",
      lat: hv.lat ?? null,
      lng: hv.lng ?? null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("location GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { address?: string, lat?: number, lng?: number }
// If lat/lng are given they're used as-is (GPS pin); otherwise the address is geocoded.
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const hv = await getLinkedHubVendor(decoded.uid);
    if (!hv) {
      return NextResponse.json({ error: "Your store isn't live on the Hub yet." }, { status: 403 });
    }

    const body = await req.json();
    const typedAddress = typeof body.address === "string" ? body.address.trim() : "";
    let lat: number;
    let lng: number;
    let address = typedAddress || hv.address || "";

    if (typeof body.lat === "number" && typeof body.lng === "number") {
      lat = body.lat;
      lng = body.lng;
    } else {
      if (!typedAddress) {
        return NextResponse.json({ error: "Enter your store address." }, { status: 400 });
      }
      const hit = await geocodeAddress(`${typedAddress}, Nigeria`);
      if (!hit) {
        return NextResponse.json(
          { error: "We couldn't find that address. Add the area or city, or use your current location." },
          { status: 422 }
        );
      }
      lat = hit.lat;
      lng = hit.lng;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isPlausibleNigeriaCoord(lat, lng)) {
      return NextResponse.json({ error: "That location doesn't look right. Try again." }, { status: 400 });
    }

    hv.lat = lat;
    hv.lng = lng;
    if (address) hv.address = address;
    await hv.save();

    if (address) {
      await Vendor.updateOne({ uid: decoded.uid }, { $set: { address } });
    }

    return NextResponse.json({ address, lat, lng });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("location POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}