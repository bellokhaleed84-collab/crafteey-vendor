import mongoose, { Schema, type Model, type Types } from "mongoose";
import { HUB_CATEGORIES, type HubCategory } from "@/lib/hub/config";

// Mirrors crafteey-client's HubProduct. Model name must stay "HubProduct".
export interface IHubProduct {
  vendorId: Types.ObjectId;
  category: HubCategory;
  name: string;
  description?: string;
  imageUrl?: string;
  emoji?: string;
  priceKobo: number;
  unit?: string;
  stock?: number | null;
  variants?: unknown[];
  isAvailable: boolean;
  isActive: boolean;
  isSeed?: boolean;
}

const HubProductSchema = new Schema<IHubProduct>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "HubVendor", required: true, index: true },
    category: { type: String, enum: HUB_CATEGORIES, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    imageUrl: String,
    emoji: String,
    priceKobo: { type: Number, required: true, min: 0 },
    unit: String,
    stock: { type: Number, default: null },
    variants: { type: [Schema.Types.Mixed], default: [] },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const HubProduct: Model<IHubProduct> =
  (mongoose.models.HubProduct as Model<IHubProduct>) ||
  mongoose.model<IHubProduct>("HubProduct", HubProductSchema);

export default HubProduct;