import { TIER_INFO, type VendorTier } from "@/lib/vendorTiers";

export default function TierCard({
  tier,
  selected,
  onSelect,
  badge,
  disabled,
}: {
  tier: VendorTier;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  const info = TIER_INFO[tier];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full rounded-2xl border-2 p-4 text-left disabled:opacity-60 ${
        selected ? "border-brand bg-brand-light" : "border-surface-border bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="font-bold text-ink">{info.label}</span>
          {badge && (
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-ink-muted">
              {badge}
            </span>
          )}
        </span>
        <span className="text-sm font-bold text-ink">{info.commissionPercent}% commission</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{info.visibility}</p>
    </button>
  );
}