import mongoose, { Schema, type Model } from "mongoose";

// Minimal view of the rider app's CourierRequest. Used to cancel the rider job
// when a vendor rejects an order, and to show the vendor which rider took it.
// Same collection, so the model name must stay "CourierRequest".
export interface ICourierRequest {
  hubOrderId: string | null;
  status: string;
  courierUid?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
}

const CourierRequestSchema = new Schema<ICourierRequest>(
  {
    hubOrderId: { type: String, default: null, index: true },
    status: { type: String, default: "pending" },
    courierUid: { type: String, default: null },
    courierName: { type: String, default: null },
    courierPhone: { type: String, default: null },
  },
  { timestamps: true, strict: false }
);

const CourierRequest: Model<ICourierRequest> =
  (mongoose.models.CourierRequest as Model<ICourierRequest>) ||
  mongoose.model<ICourierRequest>("CourierRequest", CourierRequestSchema);

export default CourierRequest;