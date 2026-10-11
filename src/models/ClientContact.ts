import mongoose, { Schema, type Model } from "mongoose";

// Read-only view of crafteey-client's Client (same "clients" collection).
// Only used to show the customer's name and phone on an active order.
export interface IClientContact {
  firebaseUid: string;
  name?: string;
  phone?: string;
}

const ClientContactSchema = new Schema<IClientContact>(
  {
    firebaseUid: { type: String, index: true },
    name: String,
    phone: String,
  },
  { strict: false, collection: "clients" }
);

const ClientContact: Model<IClientContact> =
  (mongoose.models.Client as Model<IClientContact>) ||
  mongoose.model<IClientContact>("Client", ClientContactSchema);

export default ClientContact;