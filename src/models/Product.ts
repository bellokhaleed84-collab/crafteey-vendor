import mongoose, { Schema, models, model } from "mongoose";

export interface IProductVariant {
  name: string; // e.g. "Size"
  options: { label: string; priceDelta: number }[]; // e.g. "Large", +500
}

export interface IProduct {
  vendorUid: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string; // e.g. "Meals", "Drinks"
  variants?: IProductVariant[];
  inStock: boolean;
  availableFrom?: string; // "07:00" for time-restricted items
  availableTo?: string; // "11:00"
  createdAt: Date;
  updatedAt: Date;
}

const VariantOptionSchema = new Schema(
  {
    label: { type: String, required: true },
    priceDelta: { type: Number, default: 0 }
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    name: { type: String, required: true },
    options: { type: [VariantOptionSchema], default: [] }
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    vendorUid: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    category: { type: String, required: true },
    variants: { type: [VariantSchema], default: [] },
    inStock: { type: Boolean, default: true },
    availableFrom: { type: String },
    availableTo: { type: String }
  },
  { timestamps: true }
);

export default models.Product || model<IProduct>("Product", ProductSchema);
