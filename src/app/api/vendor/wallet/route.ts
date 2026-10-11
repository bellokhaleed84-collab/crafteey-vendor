import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder from "@/models/HubOrder";
import Vendor from "@/models/Vendor";
import VendorPayout from "@/models/VendorPayout";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getLinkedHubVendor } from "@/lib/hubVendor";
import { lagosDayString, lagosWeekday } from "@/lib/lagosTime";
import {
  WITHDRAWAL_WEEKDAYS,
  WEEKDAY_NAMES,
  MIN_PAYOUT_KOBO,
  anyDayAllowed,
  daysLabel,
} from "@/lib/payoutRules";
import { computeBalance } from "@/lib/vendorBalance";
import { syncOpenPayouts } from "@/lib/vendorPayoutSync";

export const dynamic = "force-dynamic";

type BankDetails = { accountName?: string; bankName?: string; accountNumber?: string; paystackRecipientCode?: string };

function nextDayName(today: number): string {
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7;
    if (WITHDRAWAL_WEEKDAYS.includes(d)) return WEEKDAY_NAMES[d];
  }
  return "";
}

// Owner only: staff have no Vendor record, so they get "Vendor not found".
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const vendor = await Vendor.findOne({ uid: decoded.uid })
      .select("bankDetails")
      .lean<{ bankDetails?: BankDetails } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    // Ask Paystack about any open payout first, so the numbers below are current.
    try {
      await syncOpenPayouts(decoded.uid);
    } catch (e) {
      console.error("wallet payout sync failed", e);
    }

    const bank = vendor.bankDetails;
    const hasBankAccount = Boolean(bank?.paystackRecipientCode && bank?.accountNumber);
    const bankView = hasBankAccount
      ? { accountName: bank?.accountName ?? "", bankName: bank?.bankName ?? "", last4: (bank?.accountNumber ?? "").slice(-4) }
      : null;

    const now = new Date();
    const today = lagosWeekday(now);
    const todayStr = lagosDayString(now);
    const isWithdrawalDay = anyDayAllowed() || WITHDRAWAL_WEEKDAYS.includes(today);

    const rules = {
      daysLabel: daysLabel(),
      isWithdrawalDay,
      nextDay: isWithdrawalDay ? "today" : nextDayName(today),
      minPayoutKobo: MIN_PAYOUT_KOBO,
    };

    const hub = await getLinkedHubVendor(decoded.uid);
    if (!hub) {
      return NextResponse.json({
        availableKobo: 0,
        pendingKobo: 0,
        paidOutKobo: 0,
        processingKobo: 0,
        withdrawnToday: false,
        hasBankAccount,
        bank: bankView,
        rules,
        history: [],
      });
    }

    const balance = await computeBalance(decoded.uid, hub._id);

    const withdrawnToday = Boolean(
      await VendorPayout.exists({ vendorUid: decoded.uid, lagosDay: todayStr, usesDay: true })
    );

    const [orders, payouts] = await Promise.all([
      HubOrder.find({ vendorId: hub._id, status: "delivered" })
        .sort({ updatedAt: -1 })
        .limit(50)
        .select("orderNumber vendorPayoutKobo updatedAt")
        .lean(),
      VendorPayout.find({ vendorUid: decoded.uid }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    const history = [
      ...orders.map((o) => ({
        id: "o-" + String(o._id),
        kind: "order" as const,
        label: "Order #" + (o.orderNumber ?? String(o._id).slice(-6).toUpperCase()),
        amountKobo: o.vendorPayoutKobo,
        date: o.updatedAt,
        status: "delivered",
      })),
      ...payouts.map((p: any) => ({
        id: "p-" + String(p._id),
        kind: "payout" as const,
        label: "Withdrawal to " + (p.bankName || "bank"),
        amountKobo: p.amountKobo,
        date: p.createdAt,
        status: p.status as string,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);

    return NextResponse.json({
      availableKobo: balance.availableKobo,
      pendingKobo: balance.pendingKobo,
      paidOutKobo: balance.paidOutKobo,
      processingKobo: balance.processingKobo,
      withdrawnToday,
      hasBankAccount,
      bank: bankView,
      rules,
      history,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("vendor wallet GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}