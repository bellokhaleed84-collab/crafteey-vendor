import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, AuthError } from "@/middleware/auth";
import VendorStaff, { type StaffStatus } from "@/models/VendorStaff";
import { resolveStore } from "@/lib/storeAccess";

const MAX_STAFF = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type StaffRow = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  status: StaffStatus;
  joinedAt?: Date;
  createdAt: Date;
};

function toDTO(s: StaffRow) {
  return {
    _id: String(s._id),
    name: s.name,
    email: s.email ?? null,
    status: s.status,
    joinedAt: s.joinedAt ?? null,
    createdAt: s.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStore(decoded.uid);
    if (!store || store.role !== "owner") {
      return NextResponse.json({ error: "Only the store owner can manage staff." }, { status: 403 });
    }

    const rows = await VendorStaff.find({ hubVendorId: store.vendorId, status: { $ne: "removed" } })
      .sort({ createdAt: -1 })
      .lean<StaffRow[]>();

    return NextResponse.json({ staff: rows.map(toDTO) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("staff GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const store = await resolveStore(decoded.uid);
    if (!store || store.role !== "owner") {
      return NextResponse.json({ error: "Only the store owner can manage staff." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "Enter the staff member's name." }, { status: 400 });
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (decoded.email && decoded.email.toLowerCase() === email) {
      return NextResponse.json({ error: "That's your own email." }, { status: 400 });
    }

    const count = await VendorStaff.countDocuments({ hubVendorId: store.vendorId, status: { $ne: "removed" } });
    if (count >= MAX_STAFF) {
      return NextResponse.json({ error: `You can add up to ${MAX_STAFF} staff.` }, { status: 409 });
    }

    try {
      const created = await VendorStaff.create({
        hubVendorId: store.vendorId,
        ownerUid: decoded.uid,
        name,
        email,
        status: "invited",
      });
      return NextResponse.json({ staff: toDTO(created.toObject() as StaffRow) });
    } catch (e) {
      if ((e as { code?: number } | null)?.code === 11000) {
        return NextResponse.json(
          { error: "That email is already added to a store. Ask them to use a different email." },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("staff POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}