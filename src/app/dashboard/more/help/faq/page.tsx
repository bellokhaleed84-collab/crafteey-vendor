"use client";

import Link from "next/link";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I get paid?",
    a: "Your earnings are your item sales minus Crafteey's commission, once an order is delivered. Add a bank account in Settings, then open Earnings and tap Withdraw.",
  },
  {
    q: "When can I withdraw?",
    a: "Any day, but only once a day. The minimum is \u20A61,000. You choose the amount, up to your available balance.",
  },
  {
    q: "Why is my withdrawal still processing?",
    a: "Bank transfers can take a little while. Open your Wallet again in a few minutes and it will update. If it stays stuck, send us a report.",
  },
  {
    q: "How much commission does Crafteey take?",
    a: "It depends on your store tier: Basic 15%, Regular 20%, Premium 30%. Each order keeps the rate from when it was placed. You can ask for a tier change in Settings.",
  },
  {
    q: "Do delivery fees count as my earnings?",
    a: "No. Delivery fees go to riders. Your earnings come from item sales only.",
  },
  {
    q: "What happens if I reject an order?",
    a: "The customer is refunded to their wallet, and the order does not count towards your earnings.",
  },
  {
    q: "Why can't my staff see earnings?",
    a: "Staff can only work with orders. Earnings, wallet and bank details are for the owner only.",
  },
  {
    q: "I can't open my store.",
    a: "Your store must be approved before it can open. If you think it should be approved, send us a report.",
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-lg space-y-4">
      <Link href="/dashboard/more/help" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">FAQs</span>
      </Link>

      <Card className="divide-y divide-surface-border">
        {FAQS.map((f) => (
          <details key={f.q} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
              {f.q}
              <ChevronDown size={18} className="shrink-0 text-ink-faint transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-ink-muted">{f.a}</p>
          </details>
        ))}
      </Card>

      <p className="text-center text-xs text-ink-faint">
        Still stuck?{" "}
        <Link href="/dashboard/more/help/report" className="font-semibold text-brand-dark">
          Talk to support
        </Link>
      </p>
    </div>
  );
}