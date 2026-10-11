import { Schema, models, model } from "mongoose";

// Promotions and system messages for a vendor owner.
// Order notifications are NOT stored here: they are built from HubOrder.
const VendorNotificationSchema = new Schema(
  {
    vendorUid: { type: String, required: true, index: true },
    type: { type: String, enum: ["promotions", "system"], required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    link: { type: String, default: "" },
  },
  { timestamps: true }
);

VendorNotificationSchema.index({ vendorUid: 1, createdAt: -1 });

export default models.VendorNotification || model("VendorNotification", VendorNotificationSchema);