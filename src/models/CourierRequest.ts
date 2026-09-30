import mongoose, { Schema, type Model } from "mongoose";

// Minimal view of the rider app's CourierRequest, used only to cancel the
// rider job when a vendor rejects an order. Same collection, so the model
// name must stay "CourierRequest".
export interface ICourierRequest {
  hubOrderId: string | null;
  status: string;
}

const CourierRequestSchema = new Schema<ICourierRequest>(
  {
    hubOrderId: { type: String, default: null, index: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: true, strict: false }
);

const CourierRequest: Model<ICourierRequest> =
  (mongoose.models.CourierRequest as Model<ICourierRequest>) ||
  mongoose.model<ICourierRequest>("CourierRequest", CourierRequestSchema);

export default CourierRequest;