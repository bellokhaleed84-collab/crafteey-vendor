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

// Customer address is deliberately left out: riders handle delivery.
// (Customer name and phone are served by their own route, api/orders/[id]/customer.)
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
      // Promotion on this line, if any. Older orders have none.
      discount: (i.discountKobo ?? 0) / 100,
      promoLabel: i.promoLabel ?? "",
      // Extras and portion picked for ONE plate. Older orders have none.
      options: (i.options ?? []).map((op) => ({
        groupName: op.groupName ?? "",
        choiceName: op.choiceName ?? "",
        quantity: op.quantity ?? 1,
        imageUrl: op.imageUrl ?? "",
      })),
    })),
    // After promotions. This is what the payout is worked out from.
    subtotal: o.subtotalKobo / 100,
    // Before promotions and the total discount (0 when no promotion applied).
    grossSubtotal: (o.grossSubtotalKobo ?? o.subtotalKobo) / 100,
    discount: (o.discountKobo ?? 0) / 100,
    vendorPayout: o.vendorPayoutKobo / 100,
    placedAt: o.payment?.paidAt ?? o.createdAt,
  };
}

export type VendorOrder = ReturnType<typeof toVendorOrder>;