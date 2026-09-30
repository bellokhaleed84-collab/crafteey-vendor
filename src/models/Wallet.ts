import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IWallet {
  firebaseUid: string;
  clientId?: Types.ObjectId;
  balanceKobo: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    firebaseUid: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, index: true },
    // Changed only through src/lib/wallet.ts, never set directly.
    balanceKobo: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

const Wallet: Model<IWallet> =
  (mongoose.models.Wallet as Model<IWallet>) || mongoose.model<IWallet>("Wallet", WalletSchema);

export default Wallet;