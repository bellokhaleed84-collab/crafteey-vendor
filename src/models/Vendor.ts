import { Schema, models, model } from "mongoose";
import type { VendorTier } from "@/lib/vendorTiers";

export interface IVendor {
  uid: string; // Firebase uid
  businessName: string;
  category: string; // e.g. "Restaurant", "Groceries", "Pharmacy"
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  businessHours?: {
    day: string; // "Monday"
    open: string; // "08:00"
    close: string; // "20:00"
    closed: boolean;
  }[];
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  verificationDocUrl?: string; // CAC doc or ID
  tier?: VendorTier; // chosen at registration; copied to HubVendor.tier
  tierRequest?: {
    requestedTier: VendorTier;
    status: "pending" | "approved" | "rejected";
    requestedAt: Date;
  };
  status: "pending" | "approved" | "rejected" | "suspended";
  isApproved: boolean; // manual approval switch, flipped to true by you
  isOpen: boolean; // manual open/close toggle
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessHourSchema = new Schema(
  {
    day: { type: String, required: true },
    open: { type: String, default: "08:00" },
    close: { type: String, default: "20:00" },
    closed: { type: Boolean, default: false }
  },
  { _id: false }
);

const TierRequestSchema = new Schema(
  {
    requestedTier: { type: String, enum: ["basic", "regular", "premium"], required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    requestedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const VendorSchema = new Schema<IVendor>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true },
    category: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    logoUrl: { type: String },
    coverImageUrl: { type: String },
    description: { type: String },
    businessHours: { type: [BusinessHourSchema], default: [] },
    bankDetails: {
      accountName: { type: String },
      accountNumber: { type: String },
      bankName: { type: String }
    },
    verificationDocUrl: { type: String },
    tier: { type: String, enum: ["basic", "regular", "premium"] },
    tierRequest: { type: TierRequestSchema },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending"
    },
    isApproved: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default models.Vendor || model<IVendor>("Vendor", VendorSchema);