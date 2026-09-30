import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import HubVendor from "@/models/HubVendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { VENDOR_CATEGORIES } from "@/lib/vendorCategories";
import { isVendorApproved } from "@/lib/vendorApproval";

type Cleaned = { ok: true; value: string } | { ok: false };

// Logo must be an https Cloudinary link (what our signed upload returns).
// Empty / null means "remove the logo".
function cleanLogoUrl(raw: unknown): Cleaned {
  if (raw === undefined || raw === null) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false };
  const s = raw.trim();
  if (!s) return { ok: true, value: "" };
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com") return { ok: false };
    return { ok: true, value: u.toString() };
  } catch {
    return { ok: false };
  }
}

function cleanTagline(raw: unknown): Cleaned {
  if (raw === undefined || raw === null) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false };
  const s = raw.trim().replace(/\s+/g, " ");
  if (s.length > 80) return { ok: false };
  return { ok: true, value: s };
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await Vendor.findOne({ uid: decoded.uid });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor me GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const updates = await req.json().catch(() => null);
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const existing = await Vendor.findOne({ uid: decoded.uid });
    if (!existing) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Only allow editable fields to change via this route
    const allowed = [
      "businessName",
      "category",
      "phone",
      "address",
      "logoUrl",
      "coverImageUrl",
      "description",
      "tagline",
      "businessHours",
      "bankDetails",
      "isOpen",
    ];
    const patch: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key];
    }

    if (typeof patch.businessName === "string") {
      patch.businessName = patch.businessName.trim();
      if (!patch.businessName) {
        return NextResponse.json({ error: "Business name can't be empty" }, { status: 400 });
      }
    }

    if ("category" in patch && !(VENDOR_CATEGORIES as readonly string[]).includes(String(patch.category))) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if ("phone" in patch) {
      const phone = String(patch.phone ?? "").replace(/[\s-]/g, "");
      if (!/^\+?\d{10,15}$/.test(phone)) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }
      patch.phone = phone;
    }

    if ("logoUrl" in patch) {
      const logo = cleanLogoUrl(patch.logoUrl);
      if (!logo.ok) {
        return NextResponse.json(
          { error: "The store logo must be an image uploaded through the app." },
          { status: 400 }
        );
      }
      if (logo.value) {
        patch.logoUrl = logo.value;
      } else {
        delete patch.logoUrl;
        unset.logoUrl = "";
      }
    }

    if ("tagline" in patch) {
      const tagline = cleanTagline(patch.tagline);
      if (!tagline.ok) {
        return NextResponse.json(
          { error: "Tagline must be text of 80 characters or fewer." },
          { status: 400 }
        );
      }
      if (tagline.value) {
        patch.tagline = tagline.value;
      } else {
        delete patch.tagline;
        unset.tagline = "";
      }
    }

    if ("isOpen" in patch) {
      if (typeof patch.isOpen !== "boolean") {
        return NextResponse.json({ error: "isOpen must be true or false" }, { status: 400 });
      }
      // Only approved stores can go live.
      if (patch.isOpen && !isVendorApproved(existing)) {
        return NextResponse.json(
          { error: "Your store must be approved before it can open." },
          { status: 403 }
        );
      }
    }

    const hasSet = Object.keys(patch).length > 0;
    const hasUnset = Object.keys(unset).length > 0;
    if (!hasSet && !hasUnset) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const vendor = await Vendor.findOneAndUpdate(
      { uid: decoded.uid },
      {
        ...(hasSet ? { $set: patch } : {}),
        ...(hasUnset ? { $unset: unset } : {}),
      },
      { new: true, runValidators: true }
    );
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Mirror the fields customers see onto the Hub listing. updateOne (not
    // getLinkedHubVendor) so this never creates a listing; vendors with no
    // listing yet simply get it from the vendor profile when it is created.
    // If this fails the vendor profile is already saved, and retrying the
    // same change is safe.
    const hubSet: Record<string, unknown> = {};
    const hubUnset: Record<string, ""> = {};
    if ("isOpen" in patch) hubSet.isOpen = patch.isOpen;
    if ("logoUrl" in patch) hubSet.logoUrl = patch.logoUrl;
    else if ("logoUrl" in unset) hubUnset.logoUrl = "";
    if ("tagline" in patch) hubSet.tagline = patch.tagline;
    else if ("tagline" in unset) hubUnset.tagline = "";

    const hubHasSet = Object.keys(hubSet).length > 0;
    const hubHasUnset = Object.keys(hubUnset).length > 0;
    if (hubHasSet || hubHasUnset) {
      await HubVendor.updateOne(
        { ownerUid: decoded.uid },
        {
          ...(hubHasSet ? { $set: hubSet } : {}),
          ...(hubHasUnset ? { $unset: hubUnset } : {}),
        }
      );
    }

    return NextResponse.json({ vendor });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor me PATCH error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}