import mongoose, { type Types } from "mongoose";
import HubOrder from "@/models/HubOrder";
import CourierRequest from "@/models/CourierRequest";
import { creditInSession } from "@/lib/wallet";

export type RejectResult =
  | { ok: true; alreadyRejected: boolean; refundedKobo: number }
  | { ok: false; status: number; error: string };

type Code = "in_delivery" | "not_rejectable";
const stop = (code: Code) => Object.assign(new Error(code), { rejectCode: code });

// Statuses that mean the rider already has the food.
const PAST_PICKUP: string[] = ["picked_up", "en_route", "delivered"];

export async function rejectOrder(input: {
  orderId: string;
  vendorId: Types.ObjectId | string;
  reason?: string;
}): Promise<RejectResult> {
  if (!mongoose.isValidObjectId(input.orderId)) {
    return { ok: false, status: 400, error: "Invalid order id" };
  }

  const order = await HubOrder.findOne({ _id: input.orderId, vendorId: input.vendorId });
  if (!order) return { ok: false, status: 404, error: "Order not found" };
  if (order.payment.status !== "success") {
    return { ok: false, status: 409, error: "This order hasn't been paid, so there is nothing to refund" };
  }

  const alreadyDone = async (): Promise<RejectResult | null> => {
    const fresh = await HubOrder.findById(order._id).select("refund").lean();
    const refund = fresh?.refund;
    if (refund && refund.status === "refunded") {
      return { ok: true, alreadyRejected: true, refundedKobo: refund.amountKobo ?? order.totalKobo };
    }
    return null;
  };

  // A second tap after a successful reject changes nothing.
  const done = await alreadyDone();
  if (done) return done;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const courier = await CourierRequest.findOne({ hubOrderId: String(order._id) })
        .session(session)
        .select("status")
        .lean<{ status?: string } | null>();
      const courierStatus: string = courier?.status ?? "";
      if (courierStatus && PAST_PICKUP.includes(courierStatus)) throw stop("in_delivery");

      // Claim the order: it must still be a paid order the vendor hasn't accepted.
      const updated = await HubOrder.findOneAndUpdate(
        {
          _id: order._id,
          vendorId: input.vendorId,
          "payment.status": "success",
          status: "paid",
          vendorAcceptedAt: { $exists: false },
          "refund.status": { $ne: "refunded" },
        },
        {
          $set: {
            status: "cancelled",
            cancelledBy: "vendor",
            cancelReason: (input.reason || "").slice(0, 200) || undefined,
          },
        },
        { new: true, session }
      );
      if (!updated) throw stop("not_rejectable");

      // Full amount the customer paid: items + delivery.
      await creditInSession(session, {
        firebaseUid: order.firebaseUid,
        clientId: order.clientId,
        amountKobo: order.totalKobo,
        reason: "refund",
        reference: `refund_${order._id}`,
        orderId: order._id,
        note: `Refund for cancelled order ${order.orderNumber}`,
      });

      await HubOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            refund: {
              status: "refunded",
              method: "wallet",
              amountKobo: order.totalKobo,
              refundedAt: new Date(),
            },
          },
        },
        { session }
      );

      // Cancel the rider job (only while it's still waiting or accepted).
      await CourierRequest.updateOne(
        { hubOrderId: String(order._id), status: { $in: ["pending", "accepted"] } },
        { $set: { status: "cancelled" } },
        { session }
      );
    });
  } catch (e) {
    const code = (e as { rejectCode?: Code } | null)?.rejectCode;
    if (code === "in_delivery") {
      return { ok: false, status: 409, error: "The rider has already picked this order up, so it can't be rejected" };
    }
    // Lost a race with another tap (code 11000) or the order state changed.
    if (code === "not_rejectable" || (e as { code?: number } | null)?.code === 11000) {
      const d = await alreadyDone();
      if (d) return d;
      return { ok: false, status: 409, error: "This order can't be rejected right now" };
    }
    throw e;
  } finally {
    await session.endSession();
  }

  return { ok: true, alreadyRejected: false, refundedKobo: order.totalKobo };
}