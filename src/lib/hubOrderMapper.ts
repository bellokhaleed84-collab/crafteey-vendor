import type { IHubOrder } from "@/models/HubOrder";

export type VendorOrderStage = "new" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";

// What the vendor sees. HubOrder.status can't express "vendor accepted" or "ready",
// and a rider accepting sets status to "preparing" on its own, so stage is derived.
export function orderStage(
  o: Pick<IHubOrder, "status" | "vendorAcceptedAt" | "readyForPickupAt">
): VendorOrderStage {
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "delivered") return "delivered";
  if (o.status === "out_for_delivery") return "picked_up";
  if (o.readyForPickupAt) return "ready";
  if (o.vendorAcceptedAt) return "preparing";
  return "new";
}

type OrderDoc = IHubOrder & { _id: unknown };

// Customer contact and delivery address are deliberately left out: riders handle delivery.
export function toVendorOrder(o: OrderDoc) {
  return {
    _id: String(o._id),
    orderNumber: o.orderNumber,
    stage: orderStage(o),
    items: o.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      imageUrl: i.imageUrl ?? "",
      unitPrice: i.unitPriceKobo / 100,
    })),
    subtotal: o.subtotalKobo / 100,
    vendorPayout: o.vendorPayoutKobo / 100,
    placedAt: o.payment?.paidAt ?? o.createdAt,
  };
}

export type VendorOrder = ReturnType<typeof toVendorOrder>;