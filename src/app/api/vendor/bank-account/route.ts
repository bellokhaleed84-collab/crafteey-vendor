import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { verifyToken, AuthError } from "@/middleware/auth";
import { listBanks, resolveBankAccount, createTransferRecipient } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Only the owner has a Vendor record under their login, so staff always get
// "Vendor not found" here.

type BankDetails = {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  paystackRecipientCode?: string;
};

function publicView(b: BankDetails | undefined) {
  const has = Boolean(b?.paystackRecipientCode && b?.accountNumber);
  return {
    hasBankAccount: has,
    accountName: has ? b?.accountName ?? "" : "",
    bankName: has ? b?.bankName ?? "" : "",
    last4: has ? (b?.accountNumber ?? "").slice(-4) : "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();
    const vendor = await Vendor.findOne({ uid: decoded.uid })
      .select("bankDetails")
      .lean<{ bankDetails?: BankDetails } | null>();
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json(publicView(vendor.bankDetails));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("bank-account GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Body: { bankCode: string, accountNumber: string }
// Looks up the real account name with Paystack, then saves. No money moves.
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const bankCode = typeof body?.bankCode === "string" ? body.bankCode.trim() : "";
    const accountNumber = typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";

    if (!bankCode) {
      return NextResponse.json({ error: "Choose your bank." }, { status: 400 });
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Enter a 10-digit account number." }, { status: 400 });
    }

    const vendor = await Vendor.findOne({ uid: decoded.uid }).select("uid");
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    let accountName: string;
    let recipientCode: string;
    let bankName = "";
    try {
      const banks = await listBanks();
      const bank = banks.find((b) => b.code === bankCode);
      if (!bank) {
        return NextResponse.json({ error: "That bank isn't supported." }, { status: 400 });
      }
      bankName = bank.name;

      const resolved = await resolveBankAccount({ accountNumber, bankCode });
      accountName = resolved.account_name;
      const recipient = await createTransferRecipient({
        name: accountName,
        accountNumber,
        bankCode,
      });
      recipientCode = recipient.recipient_code;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      console.error("bank-account verify error", msg);
      if (msg.includes("PAYSTACK_SECRET_KEY")) {
        return NextResponse.json({ error: "Bank checks aren't set up yet." }, { status: 500 });
      }
      return NextResponse.json(
        { error: msg || "We couldn't verify that account. Check the number and bank." },
        { status: 400 }
      );
    }

    const updated = await Vendor.findOneAndUpdate(
      { uid: decoded.uid },
      {
        $set: {
          "bankDetails.accountName": accountName,
          "bankDetails.accountNumber": accountNumber,
          "bankDetails.bankName": bankName,
          "bankDetails.bankCode": bankCode,
          "bankDetails.paystackRecipientCode": recipientCode,
        },
      },
      { new: true }
    )
      .select("bankDetails")
      .lean<{ bankDetails?: BankDetails } | null>();

    return NextResponse.json(publicView(updated?.bankDetails));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("bank-account POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}