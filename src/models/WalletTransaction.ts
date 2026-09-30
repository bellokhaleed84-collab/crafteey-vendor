import mongoose, { Schema, type Model, type Types } from "mongoose";

export type WalletReason = "topup" | "order_payment" | "refund" | "adjustment";

export interface IWalletTransaction {
  firebaseUid: string;
  type: "credit" | "debit";
  reason: WalletReason;
  amountKobo: number;
  balanceAfterKobo: number;
  reference: string;
  orderId?: Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    firebaseUid: { type: String, required: true, index: true },
    type: { type: String, enum: ["credit", "debit"], required: true, immutable: true },
    reason: {
      type: String,
      enum: ["topup", "order_payment", "refund", "adjustment"],
      required: true,
      immutable: true,
    },
    amountKobo: { type: Number, required: true, min: 1, immutable: true },
    balanceAfterKobo: { type: Number, required: true, min: 0, immutable: true },
    reference: { type: String, required: true, unique: true, immutable: true },
    orderId: { type: Schema.Types.ObjectId, index: true, immutable: true },
    note: { type: String, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WalletTransactionSchema.index({ firebaseUid: 1, createdAt: -1 });

const WalletTransaction: Model<IWalletTransaction> =
  (mongoose.models.WalletTransaction as Model<IWalletTransaction>) ||
  mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);

export default WalletTransaction;