import mongoose, { Schema, type Model, type Types } from "mongoose";
import { HUB_ORDER_STATUSES, type HubOrderStatus } from "@/lib/hub/config";

// Mirrors crafteey-client's HubOrder (same "HubOrder" collection), plus three
// optional vendor-progress fields written only by this app.
export interface IHubOrder {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  firebaseUid: string;
  vendorId: Types.ObjectId;
  vendorName: string;
  orderNumber: string;
  items: { productId: Types.ObjectId; name: string; imageUrl?: string; unitPriceKobo: number; quantity: number }[];
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  vendorTier: "basic" | "regular" | "premium";
  vendorPayoutKobo: number;
  platformVendorRevenueKobo: number;
  vehicleType: "bicycle" | "motorcycle";
  deliveryLat: number;
  deliveryLng: number;
  riderEarningKobo: number;
  platformCommissionKobo: number;
  status: HubOrderStatus;
  payment: { reference?: string; status: "pending" | "success" | "failed"; paidAt?: Date; channel?: string };
  delivery: { address: string; phone?: string; note?: string };
  vendorAcceptedAt?: Date;
  readyForPickupAt?: Date;
  cancelledBy?: "vendor";
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HubOrderSchema = new Schema<IHubOrder>(
  {
    clientId: { type: Schema.Types.ObjectId, required: true, index: true },
    firebaseUid: { type: String, required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "HubVendor", required: true, index: true },
    vendorName: { type: String, required: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    items: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: "HubProduct", required: true },
        name: { type: String, required: true },
        imageUrl: String,
        unitPriceKobo: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    subtotalKobo: { type: Number, required: true },
    deliveryFeeKobo: { type: Number, required: true },
    totalKobo: { type: Number, required: true },
    vendorTier: { type: String, enum: ["basic", "regular", "premium"], required: true },
    vendorPayoutKobo: { type: Number, required: true },
    platformVendorRevenueKobo: { type: Number, required: true },
    vehicleType: { type: String, enum: ["bicycle", "motorcycle"], required: true },
    deliveryLat: { type: Number, required: true },
    deliveryLng: { type: Number, required: true },
    riderEarningKobo: { type: Number, required: true },
    platformCommissionKobo: { type: Number, required: true },
    status: { type: String, enum: HUB_ORDER_STATUSES, default: "pending_payment", index: true },
    payment: {
      reference: { type: String, unique: true, sparse: true },
      status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
      paidAt: Date,
      channel: String,
    },
    delivery: {
      address: { type: String, required: true },
      phone: String,
      note: String,
    },
    vendorAcceptedAt: Date,
    readyForPickupAt: Date,
    cancelledBy: { type: String, enum: ["vendor"] },
    cancelReason: String,
  },
  { timestamps: true }
);

const HubOrder: Model<IHubOrder> =
  (mongoose.models.HubOrder as Model<IHubOrder>) ||
  mongoose.model<IHubOrder>("HubOrder", HubOrderSchema);

export default HubOrder;