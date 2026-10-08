import mongoose, { Schema, type Model, type Types } from "mongoose";
import { HUB_CATEGORIES, type HubCategory } from "@/lib/hub/config";
import type { StoredGroup } from "@/lib/optionGroups";

// Mirrors crafteey-client's HubProduct. Model name must stay "HubProduct".
export interface IHubProduct {
  vendorId: Types.ObjectId;
  category: HubCategory;
  section?: string; // menu section shown on the store page, e.g. "Rice Dishes"
  name: string;
  description?: string;
  imageUrl?: string;
  emoji?: string;
  priceKobo: number;
  unit?: string;
  stock?: number | null;
  variants?: unknown[];
  optionGroups?: StoredGroup[];
  isAvailable: boolean;
  isActive: boolean;
  isSeed?: boolean;
}

const OptionChoiceSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    priceKobo: { type: Number, required: true, min: 0 },
    imageUrl: String,
    maxQty: { type: Number, default: 1, min: 1, max: 20 },
  },
  { _id: false }
);

const OptionGroupSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    required: { type: Boolean, default: false },
    single: { type: Boolean, default: false },
    choices: { type: [OptionChoiceSchema], default: [] },
  },
  { _id: false }
);

const HubProductSchema = new Schema<IHubProduct>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "HubVendor", required: true, index: true },
    category: { type: String, enum: HUB_CATEGORIES, required: true, index: true },
    section: { type: String, trim: true, maxlength: 40 },
    name: { type: String, required: true, trim: true },
    description: String,
    imageUrl: String,
    emoji: String,
    priceKobo: { type: Number, required: true, min: 0 },
    unit: String,
    stock: { type: Number, default: null },
    variants: { type: [Schema.Types.Mixed], default: [] },
    optionGroups: { type: [OptionGroupSchema], default: [] },
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