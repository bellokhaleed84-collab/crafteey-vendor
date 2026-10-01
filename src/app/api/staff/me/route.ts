import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, AuthError } from "@/middleware/auth";
import HubVendor from "@/models/HubVendor";
import VendorStaff from "@/models/VendorStaff";
import { resolveStoreForUser, type StoreUser } from "@/lib/storeAccess";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const user = decoded as unknown as StoreUser;

    // Activates an invite when this login has a VERIFIED email an owner added.
    const access = await resolveStoreForUser(user);

    if (!access) {
      // Invited but hasn't verified the email yet: tell the app to show the
      // "Verify your email" screen instead of "No store found".
      const email = user.email?.trim().toLowerCase();
      if (email && user.email_verified !== true) {
        const invited = await VendorStaff.exists({ email, status: "invited" });
        if (invited) {
          return NextResponse.json(
            { error: "Verify your email to continue", needsEmailVerification: true },
            { status: 403 }
          );
        }
      }
      return NextResponse.json({ error: "Not part of a store" }, { status: 404 });
    }

    const store = await HubVendor.findById(access.vendorId).select("name isOpen").lean();
    return NextResponse.json({
      role: access.role,
      store: { name: store?.name ?? "Store", isOpen: store?.isOpen ?? false },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("staff me error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}