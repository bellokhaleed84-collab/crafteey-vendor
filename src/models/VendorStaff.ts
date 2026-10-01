import mongoose, { Schema, type Model, type Types } from "mongoose";

export type StaffStatus = "invited" | "active" | "removed";

export interface IVendorStaff {
  hubVendorId: Types.ObjectId;
  ownerUid: string;
  name: string;
  /** Lowercase. Staff get access by signing in with this verified email. */
  email?: string;
  status: StaffStatus;
  /** Firebase uid, set the first time they sign in with the verified email. */
  staffUid?: string;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorStaffSchema = new Schema<IVendorStaff>(
  {
    hubVendorId: { type: Schema.Types.ObjectId, ref: "HubVendor", required: true, index: true },
    ownerUid: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // One store per email and per staff login. Both are unset on removal.
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    status: { type: String, enum: ["invited", "active", "removed"], default: "invited", index: true },
    staffUid: { type: String, unique: true, sparse: true },
    joinedAt: Date,
  },
  { timestamps: true }
);

const VendorStaff: Model<IVendorStaff> =
  (mongoose.models.VendorStaff as Model<IVendorStaff>) ||
  mongoose.model<IVendorStaff>("VendorStaff", VendorStaffSchema);

export default VendorStaff;