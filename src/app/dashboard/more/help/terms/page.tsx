"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function TermsPage() {
  return (
    <div className="max-w-lg space-y-4">
      <Link href="/dashboard/more/help" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Terms of Service</span>
      </Link>
      <Card className="space-y-3 p-4 text-sm text-ink-muted">
        <p>
          By selling on Crafteey you agree to prepare orders accurately and on time, keep your menu, prices and
          opening hours up to date, and follow the law for the goods you sell.
        </p>
        <p>
          Crafteey takes a commission on each delivered order, based on your store tier. Your earnings are paid to the
          bank account you add, subject to the withdrawal rules shown in your Wallet.
        </p>
        <p>
          Crafteey may suspend a store that breaks these rules, receives repeated serious complaints, or gives false
          information.
        </p>
        <p className="text-xs text-ink-faint">
          This is a short summary and will be replaced by the full terms.
        </p>
      </Card>
    </div>
  );
}