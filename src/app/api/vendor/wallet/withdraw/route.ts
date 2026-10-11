import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorPayout from "@/models/VendorPayout";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { lagosDayString, lagosWeekday } from "@/lib/lagosTime";
import { WITHDRAWAL_WEEKDAYS, MIN_PAYOUT_KOBO, anyDayAllowed } from "@/lib/payoutRules";
import { computeBalance } from "@/lib/vendorBalance";
import { syncOpenPayouts, markPaid, markFailed, markProcessing } from "@/lib/vendorPayoutSync";
import { initiateTransfer, PaystackError } from "@/lib/paystack";

export const dynamic = "force-dynamic";

type BankDetails = {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  paystackRecipientCode?: string;
};

function naira(kobo: number): string {
  return `\u20A6${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

// Body: { amountKobo: number }  (a whole number of kobo)
// Owner only: staff have no Vendor record, so they get "Vendor not found".
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const uid = decoded.uid;

    const body = await req.json().catch(() => null);
    const requestedKobo = body?.amountKobo;
    if (typeof requestedKobo !== "number" || !Number.isInteger(requestedKobo) || requestedKobo <= 0) {
      return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    }
    if (requestedKobo < MIN_PAYOUT_KOBO) {
      return NextResponse.json(
        { error: `The minimum withdrawal is ${naira(MIN_PAYOUT_KOBO)}.` },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findOne({ uid })
      .select("bankDetails")
      .lean<{ bankDetails?: BankDetails } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const bank = vendor.bankDetails;
    if (!bank?.paystackRecipientCode || !bank?.accountNumber) {
      return NextResponse.json({ error: "Add your bank account before withdrawing." }, { status: 400 });
    }

    const now = new Date();
    if (!anyDayAllowed() && !WITHDRAWAL_WEEKDAYS.includes(lagosWeekday(now))) {
      return NextResponse.json({ error: "Withdrawals aren't available today." }, { status: 400 });
    }

    const hub = await getLinkedHubVendor(uid);
    if (!hub) return NextResponse.json({ error: "Your store isn't approved yet." }, { status: 403 });

    // Settle anything left over from before, so a stale payout doesn't block this one.
    await syncOpenPayouts(uid);

    if (await VendorPayout.exists({ vendorUid: uid, holdsSlot: true })) {
      return NextResponse.json(
        { error: "You already have a withdrawal being processed. Please wait for it to finish." },
        { status: 409 }
      );
    }

    const todayStr = lagosDayString(now);
    if (await VendorPayout.exists({ vendorUid: uid, lagosDay: todayStr, usesDay: true })) {
      return NextResponse.json({ error: "You can only withdraw once a day." }, { status: 409 });
    }

    // The balance is worked out here on the server. The amount the phone sent
    // is only a request and can never be more than this.
    const balance = await computeBalance(uid, hub._id);
    if (requestedKobo > balance.availableKobo) {
      return NextResponse.json(
        { error: `You can withdraw up to ${naira(balance.availableKobo)}.` },
        { status: 400 }
      );
    }
    const amountKobo = requestedKobo;

    // Save the payout BEFORE asking Paystack. The database allows only one
    // active payout and one per day, so a double tap cannot send twice.
    const reference = `vpo-${uid.slice(0, 8)}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
    let payout;
    try {
      payout = await VendorPayout.create({
        vendorUid: uid,
        hubVendorId: hub._id,
        amountKobo,
        status: "pending",
        paystackTransferRef: reference,
        lagosDay: todayStr,
        holdsSlot: true,
        usesDay: true,
        bankName: bank.bankName ?? "",
        accountName: bank.accountName ?? "",
        last4: (bank.accountNumber ?? "").slice(-4),
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "A withdrawal is already in progress or was already made today." },
          { status: 409 }
        );
      }
      throw err;
    }

    try {
      const t = await initiateTransfer({
        amountKobo,
        recipientCode: bank.paystackRecipientCode,
        reference,
      });

      if (t.status === "success") {
        await markPaid(payout._id, t.transfer_code);
        return NextResponse.json({ ok: true, status: "paid", amountKobo });
      }
      if (t.status === "failed" || t.status === "reversed") {
        await markFailed(payout._id, "Paystack reported: " + t.status);
        return NextResponse.json(
          { error: "The withdrawal could not be sent. Your balance is unchanged." },
          { status: 502 }
        );
      }
      if (t.status === "otp") {
        // Paystack is waiting for an OTP code. We can't send it, so give up cleanly.
        await markFailed(payout._id, "Paystack asked for an OTP. Turn off transfer OTP in the Paystack dashboard.");
        return NextResponse.json(
          { error: "Withdrawals aren't set up yet. Please contact support." },
          { status: 502 }
        );
      }
      await markProcessing(payout._id, t.transfer_code);
      return NextResponse.json({ ok: true, status: "processing", amountKobo });
    } catch (err) {
      if (err instanceof PaystackError && err.definite) {
        console.error("vendor withdraw refused by Paystack:", err.message);
        await markFailed(payout._id, err.message);
        return NextResponse.json(
          { error: "The withdrawal could not be sent. Your balance is unchanged." },
          { status: 502 }
        );
      }
      // Unclear: the money might have been sent. Leave it Processing and check later.
      console.error("vendor withdraw unclear result:", err);
      return NextResponse.json({ ok: true, status: "processing", amountKobo });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor withdraw error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}