import type { IPromotion } from "@/models/Promotion";

export type PromoStatus = "active" | "scheduled" | "ended" | "stopped";

export function promoLabel(p: {
  type: "percent" | "amount" | "buy_get";
  percent?: number;
  amountOffKobo?: number;
  buyQty?: number;
  freeQty?: number;
}): string {
  if (p.type === "percent") return `${p.percent ?? 0}% off`;
  if (p.type === "amount") return `\u20A6${Math.round((p.amountOffKobo ?? 0) / 100).toLocaleString("en-NG")} off`;
  return `Buy ${p.buyQty ?? 0} get ${p.freeQty ?? 0} free`;
}

export function promoStatus(
  p: { isActive: boolean; startsAt: Date; endsAt?: Date | null },
  now: Date = new Date()
): PromoStatus {
  if (!p.isActive) return "stopped";
  if (p.endsAt && new Date(p.endsAt).getTime() <= now.getTime()) return "ended";
  if (new Date(p.startsAt).getTime() > now.getTime()) return "scheduled";
  return "active";
}

export function toPromotionDto(p: IPromotion) {
  return {
    _id: String(p._id),
    type: p.type,
    label: promoLabel(p),
    scope: p.scope,
    productCount: (p.productIds ?? []).length,
    startsAt: new Date(p.startsAt).toISOString(),
    endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null,
    isActive: p.isActive,
    status: promoStatus(p),
  };
}

export type PromotionDto = ReturnType<typeof toPromotionDto>;