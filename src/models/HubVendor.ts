import mongoose, { Schema, type Model } from "mongoose";

// Mirrors crafteey-client's HubVendor schema. Both apps share the same
// MongoDB database and collection, so this app needs its own local copy
// of the model to query/create HubVendor documents — Mongoose models
// aren't shared across separate Next.js projects even when they point
// at the same database.

export type HubCategory = "food" | "groceries" | "drinks" | "marketplace";
export type VendorTier = "basic" | "regular" | "premium";

export interface IHubVendor {
  ownerUid?: string;
  name: string;
  categories: HubCategory[];
  description?: string;
  logoUrl?: string;
  address?: string;
  lat?: number;
  lng?: number;
  emoji?: string;
  tagline?: string;
  filterTags?: string[];
  rating?: number;
  reviewCount?: number;
  etaMin?: number;
  etaMax?: number;
  /** 24-hour "HH:mm", e.g. "08:00" */
  openTime?: string;
  closeTime?: string;
  isOpen: boolean;
  isActive: boolean;
  isSeed?: boolean;
  tier: VendorTier;
}

const HubVendorSchema = new Schema<IHubVendor>(
  {
    ownerUid: { type: String, index: true, sparse: true, unique: true },
    name: { type: String, required: true, trim: true },
    categories: {
      type: [{ type: String, enum: ["food", "groceries", "drinks", "marketplace"] }],
      default: [],
      index: true,
    },
    description: String,
    logoUrl: String,
    address: String,
    lat: Number,
    lng: Number,
    emoji: String,
    tagline: String,
    filterTags: { type: [String], default: [] },
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, min: 0 },
    etaMin: Number,
    etaMax: Number,
    openTime: String,
    closeTime: String,
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isSeed: { type: Boolean, default: false },
    tier: { type: String, enum: ["basic", "regular", "premium"], default: "regular", index: true },
  },
  { timestamps: true }
);

const HubVendor: Model<IHubVendor> =
  (mongoose.models.HubVendor as Model<IHubVendor>) ||
  mongoose.model<IHubVendor>("HubVendor", HubVendorSchema);

export default HubVendor;