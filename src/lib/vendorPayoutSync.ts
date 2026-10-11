import type { Types } from "mongoose";
import VendorPayout from "@/models/VendorPayout";
import { verifyTransfer, PaystackError } from "@/lib/paystack";

const OPEN = ["pending", "processing"];
const NEVER_SENT_AFTER_MS = 10 * 60 * 1000;

export async function markPaid(id: Types.ObjectId | string, transferCode?: string) {
  await VendorPayout.updateOne(
    { _id: id, status: { $in: OPEN } },
    {
      $set: {
        status: "paid",
        holdsSlot: false,
        ...(transferCode ? { paystackTransferCode: transferCode } : {}),
      },
    }
  );
}

// A failed payout frees both the "one at a time" slot and the day.
export async function markFailed(id: Types.ObjectId | string, reason: string) {
  await VendorPayout.updateOne(
    { _id: id, status: { $in: OPEN } },
    { $set: { status: "failed", holdsSlot: false, usesDay: false, failureReason: reason } }
  );
}

export async function markProcessing(id: Types.ObjectId | string, transferCode?: string) {
  await VendorPayout.updateOne(
    { _id: id, status: { $in: OPEN } },
    {
      $set: {
        status: "processing",
        ...(transferCode ? { paystackTransferCode: transferCode } : {}),
      },
    }
  );
}

// Asks Paystack about every open payout of this vendor and updates it.
// Replaces the webhook (the one webhook URL points at the rider app).
// An unclear answer leaves the payout as it is. Nothing is guessed.
export async function syncOpenPayouts(vendorUid: string) {
  const open = await VendorPayout.find({ vendorUid, status: { $in: OPEN } }).limit(5);
  for (const p of open) {
    try {
      const t = await verifyTransfer(p.paystackTransferRef);
      if (t.status === "success") {
        await markPaid(p._id, t.transfer_code);
      } else if (t.status === "failed" || t.status === "reversed") {
        await markFailed(p._id, "Paystack reported: " + t.status);
      } else if (p.status === "pending") {
        await markProcessing(p._id, t.transfer_code);
      }
    } catch (err) {
      const age = Date.now() - new Date(p.createdAt).getTime();
      if (err instanceof PaystackError && err.definite && err.status === 404 && age > NEVER_SENT_AFTER_MS) {
        await markFailed(p._id, "Transfer was never received by Paystack");
      }
      // Anything else: leave it and check again next time.
    }
  }
}