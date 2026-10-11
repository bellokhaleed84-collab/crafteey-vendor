"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <div className="max-w-lg space-y-4">
      <Link href="/dashboard/more/help" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Privacy Policy</span>
      </Link>
      <Card className="space-y-3 p-4 text-sm text-ink-muted">
        <p>
          We collect the details you give us (business name, contact details, address, bank account) and information
          about your orders, so we can run your store, pay you and keep the platform safe.
        </p>
        <p>
          Your bank details are checked with our payment provider and are used only to send your payouts. Customer
          contact details are kept private and are not shown to you.
        </p>
        <p>We do not sell your personal data. You can ask us to correct your details at any time through support.</p>
        <p className="text-xs text-ink-faint">
          This is a short summary and will be replaced by the full policy.
        </p>
      </Card>
    </div>
  );
}