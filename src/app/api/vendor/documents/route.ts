import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";

export const dynamic = "force-dynamic";

const MAX_DOCS = 6;
const TYPES = ["cac", "id", "other"];
const FIELDS = "businessDocuments status rejectionReason resubmittedAt";

type DocRow = { _id: unknown; type: string; url: string; uploadedAt: Date };
type VendorDocs = {
  businessDocuments?: DocRow[];
  status?: string;
  rejectionReason?: string;
  resubmittedAt?: Date | null;
};

function view(v: VendorDocs) {
  return {
    documents: (v.businessDocuments ?? []).map((d) => ({
      id: String(d._id),
      type: d.type,
      url: d.url,
      uploadedAt: d.uploadedAt,
    })),
    status: v.status ?? "pending",
    rejectionReason: v.rejectionReason ?? "",
    resubmittedAt: v.resubmittedAt ?? null,
  };
}

// Only https links on our Cloudinary account (what the signed upload returns).
function cloudinaryUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Owner only: staff have no Vendor record, so they get "Vendor not found".
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await Vendor.findOne({ uid: decoded.uid }).select(FIELDS).lean<VendorDocs | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json(view(vendor));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor documents GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { type: "cac" | "id" | "other", url: string }
// A rejected vendor who adds a document goes back to Pending for review.
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const type = typeof body?.type === "string" ? body.type : "";
    const url = cloudinaryUrl(body?.url);
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: "Choose what kind of document this is." }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "The document must be uploaded through the app." }, { status: 400 });
    }

    const vendor = await Vendor.findOne({ uid: decoded.uid }).select(FIELDS).lean<VendorDocs | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    if (vendor.status === "suspended") {
      return NextResponse.json({ error: "Your store is suspended. Please contact support." }, { status: 403 });
    }
    if ((vendor.businessDocuments?.length ?? 0) >= MAX_DOCS) {
      return NextResponse.json(
        { error: `You can keep up to ${MAX_DOCS} documents. Remove one first.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const set: Record<string, unknown> = { verificationDocUrl: url };
    if (vendor.status === "rejected") {
      set.status = "pending";
      set.resubmittedAt = now;
    }

    const updated = await Vendor.findOneAndUpdate(
      { uid: decoded.uid },
      { $push: { businessDocuments: { type, url, uploadedAt: now } }, $set: set },
      { new: true }
    )
      .select(FIELDS)
      .lean<VendorDocs | null>();

    return NextResponse.json(view(updated ?? vendor), { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor documents POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/vendor/documents?id=<document id>
export async function DELETE(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const exists = await Vendor.exists({ uid: decoded.uid });
    if (!exists) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    await Vendor.updateOne({ uid: decoded.uid }, { $pull: { businessDocuments: { _id: id } } });

    const after = await Vendor.findOne({ uid: decoded.uid }).select(FIELDS).lean<VendorDocs | null>();
    const docs = after?.businessDocuments ?? [];
    const last = docs[docs.length - 1];
    if (last) {
      await Vendor.updateOne({ uid: decoded.uid }, { $set: { verificationDocUrl: last.url } });
    } else {
      await Vendor.updateOne({ uid: decoded.uid }, { $unset: { verificationDocUrl: "" } });
    }

    return NextResponse.json(view(after ?? {}));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor documents DELETE error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}