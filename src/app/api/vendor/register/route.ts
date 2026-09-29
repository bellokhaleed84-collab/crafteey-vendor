import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { VENDOR_CATEGORIES } from "@/lib/vendorCategories";

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const businessName = String(body.businessName ?? "").trim();
    const category = String(body.category ?? "");
    const phone = String(body.phone ?? "").replace(/[\s-]/g, "");
    const address = String(body.address ?? "").trim();
    // Use the email Firebase verified, not one the client sent.
    const email = decoded.email;

    if (!businessName || !category || !phone || !address || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!(VENDOR_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!/^\+?\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    let verificationDocUrl: string | undefined;
    if (body.verificationDocUrl) {
      try {
        const parsed = new URL(String(body.verificationDocUrl).trim());
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error("bad protocol");
        }
        verificationDocUrl = parsed.toString();
      } catch {
        return NextResponse.json(
          { error: "The verification document link must be a valid web address starting with https://" },
          { status: 400 }
        );
      }
    }

    const existing = await Vendor.findOne({ uid: decoded.uid });
    if (existing) {
      return NextResponse.json(
        { error: "Vendor profile already exists" },
        { status: 409 }
      );
    }

    const vendor = await Vendor.create({
      uid: decoded.uid,
      businessName,
      category,
      email,
      phone,
      address,
      verificationDocUrl,
      status: "pending",
      isApproved: false,
      isOpen: false,
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor register error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}