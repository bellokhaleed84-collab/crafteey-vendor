"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Inbox, HelpCircle, Phone, FileText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

const HOTLINE = process.env.NEXT_PUBLIC_SUPPORT_HOTLINE || "";

function Row({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Inbox;
  label: string;
  hint: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink-faint" />
    </Link>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-lg space-y-5">
      <Link href="/dashboard/more" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Help & Support</span>
      </Link>

      <Link
        href="/dashboard/more/help/report"
        className="flex items-center justify-center gap-2 rounded-xl bg-brand py-4 text-sm font-bold text-brand-ink"
      >
        <MessageCircle size={18} />
        Talk to support
      </Link>

      <Card className="divide-y divide-surface-border">
        <Row href="/dashboard/more/help/tickets" icon={Inbox} label="My support chats" hint="Your reports and our replies" />
        <Row href="/dashboard/more/help/faq" icon={HelpCircle} label="FAQs" hint="Quick answers" />
        {HOTLINE && (
          <a href={`tel:${HOTLINE}`} className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Phone size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Call support</p>
              <p className="text-xs text-ink-muted">{HOTLINE}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-faint" />
          </a>
        )}
        <Row href="/dashboard/more/help/terms" icon={FileText} label="Terms of Service" hint="Rules for using Crafteey" />
        <Row href="/dashboard/more/help/privacy" icon={ShieldCheck} label="Privacy Policy" hint="How we handle your data" />
      </Card>
    </div>
  );
}