import mongoose, { Schema, models, model } from "mongoose";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "cancelled";

export interface IOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedVariants?: { name: string; option: string; priceDelta: number }[];
}

export interface IOrder {
  vendorUid: string;
  customerUid: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  note?: string;
  status: OrderStatus;
  rejectionReason?: string;
  prepTimeMinutes?: number;
  courierUid?: string;
  acceptedAt?: Date;
  readyAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    selectedVariants: [
      {
        name: String,
        option: String,
        priceDelta: Number
      }
    ]
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    vendorUid: { type: String, required: true, index: true },
    customerUid: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    note: { type: String },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "preparing",
        "ready_for_pickup",
        "picked_up",
        "delivered",
        "cancelled"
      ],
      default: "pending"
    },
    rejectionReason: { type: String },
    prepTimeMinutes: { type: Number },
    courierUid: { type: String },
    acceptedAt: { type: Date },
    readyAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

export default models.Order || model<IOrder>("Order", OrderSchema);
