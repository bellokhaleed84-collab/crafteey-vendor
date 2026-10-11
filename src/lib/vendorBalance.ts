import type { Types } from "mongoose";
import HubOrder from "@/models/HubOrder";
import VendorPayout from "@/models/VendorPayout";

// Cancelled and unpaid orders never count.
const COUNTED_STATUSES = ["paid", "preparing", "out_for_delivery", "delivered"];

export interface VendorBalance {
  earnedKobo: number;
  pendingKobo: number;
  paidOutKobo: number;
  processingKobo: number;
  availableKobo: number;
}

// The balance is never stored. It is worked out from delivered orders minus
// payouts. Failed payouts are not subtracted, so that money comes back by itself.
export async function computeBalance(vendorUid: string, hubVendorId: Types.ObjectId): Promise<VendorBalance> {
  const [orderTotals] = await HubOrder.aggregate<{ earnedKobo: number; pendingKobo: number }>([
    { $match: { vendorId: hubVendorId, status: { $in: COUNTED_STATUSES } } },
    {
      $group: {
        _id: null,
        earnedKobo: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$vendorPayoutKobo", 0] } },
        pendingKobo: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 0, "$vendorPayoutKobo"] } },
      },
    },
  ]);

  const groups = await VendorPayout.aggregate<{ _id: string; total: number }>([
    { $match: { vendorUid } },
    { $group: { _id: "$status", total: { $sum: "$amountKobo" } } },
  ]);
  const by: Record<string, number> = {};
  for (const g of groups) by[g._id] = g.total;

  const earnedKobo = orderTotals?.earnedKobo ?? 0;
  const pendingKobo = orderTotals?.pendingKobo ?? 0;
  const paidOutKobo = by.paid ?? 0;
  const processingKobo = (by.pending ?? 0) + (by.processing ?? 0);
  const availableKobo = Math.max(0, earnedKobo - paidOutKobo - processingKobo);
  return { earnedKobo, pendingKobo, paidOutKobo, processingKobo, availableKobo };
}