import { Schema, models, model } from "mongoose";

// One row per withdrawal a vendor owner requests.
// The vendor's balance is never stored. It is worked out from delivered
// orders minus these rows, so a failed payout simply stops counting.
export const VENDOR_PAYOUT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
} as const;

const VendorPayoutSchema = new Schema(
  {
    vendorUid: { type: String, required: true, index: true },
    hubVendorId: { type: Schema.Types.ObjectId, required: true },
    amountKobo: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(VENDOR_PAYOUT_STATUS),
      default: VENDOR_PAYOUT_STATUS.PENDING,
      index: true,
    },
    paystackTransferRef: { type: String, required: true, unique: true },
    paystackTransferCode: { type: String, default: null },
    failureReason: { type: String, default: null },
    // Lagos calendar day, "YYYY-MM-DD".
    lagosDay: { type: String, required: true },
    // True while the payout is pending or processing. Only one allowed at a time.
    holdsSlot: { type: Boolean, default: true },
    // True unless the payout failed. Only one per Lagos day allowed.
    usesDay: { type: Boolean, default: true },
    bankName: { type: String, default: "" },
    accountName: { type: String, default: "" },
    last4: { type: String, default: "" },
  },
  { timestamps: true }
);

// The database itself blocks a second active payout and a second payout in a day.
VendorPayoutSchema.index(
  { vendorUid: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true }, name: "one_active_payout" }
);
VendorPayoutSchema.index(
  { vendorUid: 1, lagosDay: 1 },
  { unique: true, partialFilterExpression: { usesDay: true }, name: "one_payout_per_day" }
);

export default models.VendorPayout || model("VendorPayout", VendorPayoutSchema);