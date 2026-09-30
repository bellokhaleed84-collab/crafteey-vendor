import { type ClientSession, type Types, type UpdateQuery } from "mongoose";
import Wallet, { type IWallet } from "@/models/Wallet";
import WalletTransaction, { type WalletReason } from "@/models/WalletTransaction";

export interface MoveInput {
  firebaseUid: string;
  clientId?: Types.ObjectId;
  amountKobo: number;
  reason: WalletReason;
  reference: string; // unique per money move, e.g. refund_<orderId>
  orderId?: Types.ObjectId | string;
  note?: string;
}

export async function creditInSession(
  session: ClientSession,
  input: MoveInput
): Promise<{ applied: boolean; balanceKobo: number }> {
  if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) {
    throw new Error("Wallet amount must be a positive whole number of kobo");
  }

  const existing = await WalletTransaction.findOne({ reference: input.reference })
    .session(session)
    .select("balanceAfterKobo")
    .lean();
  if (existing) return { applied: false, balanceKobo: existing.balanceAfterKobo };

  const update: UpdateQuery<IWallet> = { $inc: { balanceKobo: input.amountKobo } };
  if (input.clientId) update.$setOnInsert = { clientId: input.clientId };

  const wallet = await Wallet.findOneAndUpdate({ firebaseUid: input.firebaseUid }, update, {
    new: true,
    upsert: true,
    session,
  });
  if (!wallet) throw new Error("Wallet update failed");

  await WalletTransaction.create(
    [
      {
        firebaseUid: input.firebaseUid,
        type: "credit",
        reason: input.reason,
        amountKobo: input.amountKobo,
        balanceAfterKobo: wallet.balanceKobo,
        reference: input.reference,
        orderId: input.orderId,
        note: input.note,
      },
    ],
    { session }
  );

  return { applied: true, balanceKobo: wallet.balanceKobo };
}