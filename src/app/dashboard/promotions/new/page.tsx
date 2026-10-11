"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Minus, Plus, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type PromoType = "percent" | "amount" | "buy_get";
type Scope = "all" | "products";

interface ProductRow {
  _id: string;
  name: string;
  priceKobo: number;
}

const TYPES: { key: PromoType; label: string; hint: string }[] = [
  { key: "percent", label: "Percent off", hint: "e.g. 20% off" },
  { key: "amount", label: "Amount off", hint: "e.g. \u20A6500 off each plate" },
  { key: "buy_get", label: "Buy & get free", hint: "e.g. buy 3 get 1 free" },
];

const PERCENT_CHIPS = [10, 15, 20, 25, 30, 50];

const DURATIONS: { days: number; label: string }[] = [
  { days: 0, label: "Until I stop it" },
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

const chip = (on: boolean) =>
  `rounded-xl border px-4 py-3 text-sm font-semibold transition ${
    on ? "border-brand bg-brand text-brand-ink" : "border-surface-border bg-surface text-ink-muted"
  }`;

const field =
  "w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-base text-ink outline-none focus:border-brand";

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Less ${label}`}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-ink"
        >
          <Minus size={18} />
        </button>
        <span className="w-8 text-center text-lg font-bold text-ink">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`More ${label}`}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-ink"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export default function NewPromotionPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [type, setType] = useState<PromoType>("percent");
  const [percent, setPercent] = useState("20");
  const [amountNaira, setAmountNaira] = useState("");
  const [buyQty, setBuyQty] = useState(3);
  const [freeQty, setFreeQty] = useState(1);
  const [scope, setScope] = useState<Scope>("products");
  const [picked, setPicked] = useState<string[]>([]);
  const [days, setDays] = useState(7);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(getToken, "/api/promotions/products");
        if (!res.ok) throw new Error(await readError(res, "Couldn't load your items."));
        const data = await res.json();
        setProducts(data.products ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your items.");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [getToken]);

  const percentNum = Number(percent);
  const amountNum = Number(amountNaira);
  const valueOk =
    type === "percent"
      ? Number.isInteger(percentNum) && percentNum >= 1 && percentNum <= 90
      : type === "amount"
      ? Number.isFinite(amountNum) && amountNum > 0
      : true;
  const scopeOk = scope === "all" || picked.length > 0;
  const canSave = valueOk && scopeOk && !saving;

  const togglePick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(getToken, "/api/promotions", {
        method: "POST",
        body: JSON.stringify({
          type,
          percent: type === "percent" ? percentNum : undefined,
          amountNaira: type === "amount" ? amountNum : undefined,
          buyQty: type === "buy_get" ? buyQty : undefined,
          freeQty: type === "buy_get" ? freeQty : undefined,
          scope,
          productIds: scope === "products" ? picked : [],
          days,
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't start this promotion."));
      router.replace("/dashboard/promotions");
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start this promotion.");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/promotions" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">New promotion</span>
      </Link>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-ink">What kind of promotion?</h2>
        <div className="grid grid-cols-1 gap-2">
          {TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => setType(t.key)} className={chip(type === t.key) + " text-left"}>
              <span className="block">{t.label}</span>
              <span className={`block text-xs font-normal ${type === t.key ? "text-brand-ink" : "text-ink-faint"}`}>
                {t.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {type === "percent" && (
          <>
            <h2 className="text-sm font-bold text-ink">How many percent off?</h2>
            <div className="flex flex-wrap gap-2">
              {PERCENT_CHIPS.map((n) => (
                <button key={n} type="button" onClick={() => setPercent(String(n))} className={chip(percent === String(n))}>
                  {n}%
                </button>
              ))}
            </div>
            <input
              inputMode="numeric"
              value={percent}
              onChange={(e) => setPercent(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="Or type a number (1 to 90)"
              className={field}
            />
          </>
        )}

        {type === "amount" && (
          <>
            <h2 className="text-sm font-bold text-ink">How much off each plate?</h2>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink">{"\u20A6"}</span>
              <input
                inputMode="numeric"
                value={amountNaira}
                onChange={(e) => setAmountNaira(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
                placeholder="500"
                className={field}
              />
            </div>
          </>
        )}

        {type === "buy_get" && (
          <>
            <h2 className="text-sm font-bold text-ink">How does it work?</h2>
            <Card className="space-y-3 p-4">
              <Stepper label="Customer buys" value={buyQty} min={1} max={20} onChange={setBuyQty} />
              <Stepper label="And gets free" value={freeQty} min={1} max={10} onChange={setFreeQty} />
            </Card>
            <p className="text-xs text-ink-muted">
              Buy {buyQty} get {freeQty} free means every {buyQty + freeQty} plates, {freeQty} {freeQty === 1 ? "is" : "are"} free.
            </p>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-ink">What does it apply to?</h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setScope("products")} className={chip(scope === "products")}>
            Chosen items
          </button>
          <button type="button" onClick={() => setScope("all")} className={chip(scope === "all")}>
            Whole shop
          </button>
        </div>

        {scope === "products" &&
          (loadingProducts ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-ink-muted">You have no items yet. Add items under Products first.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const on = picked.includes(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => togglePick(p._id)}
                    aria-pressed={on}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                      on ? "border-brand bg-brand-light" : "border-surface-border bg-surface"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        on ? "border-brand bg-brand text-brand-ink" : "border-surface-border"
                      }`}
                    >
                      {on && <Check size={14} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {"\u20A6"}
                      {Math.round(p.priceKobo / 100).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-ink">How long?</h2>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button key={d.days} type="button" onClick={() => setDays(d.days)} className={chip(days === d.days)}>
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-surface-muted p-3 text-xs text-ink-muted">
        The discount comes out of your price, so your payout for these orders is lower. Delivery fees are not changed.
        Customers see the offer on the Hub right away.
      </p>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-50"
      >
        {saving ? "Starting..." : "Start promotion"}
      </button>
    </div>
  );
}