const BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  return key;
}

// definite = true: Paystack answered and said no, so nothing happened.
// definite = false: we don't know (timeout, network drop, Paystack outage).
export class PaystackError extends Error {
  status: number;
  definite: boolean;
  constructor(message: string, status: number, definite: boolean) {
    super(message);
    this.status = status;
    this.definite = definite;
  }
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new PaystackError("Couldn't reach Paystack. Please try again.", 0, false);
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => null);
  if (res.status >= 500) {
    throw new PaystackError(json?.message || `Paystack is unavailable (${res.status})`, res.status, false);
  }
  if (!res.ok || !json?.status) {
    throw new PaystackError(json?.message || `Paystack request failed (${res.status})`, res.status, true);
  }
  return json.data as T;
}

export interface PaystackBank {
  name: string;
  code: string;
}

// Paystack's bank list barely changes, so keep it for an hour.
let cachedBanks: PaystackBank[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function listBanks(): Promise<PaystackBank[]> {
  if (cachedBanks && Date.now() - cachedAt < CACHE_TTL_MS) return cachedBanks;
  const data = await paystack<{ name: string; code: string; active: boolean }[]>(
    "/bank?currency=NGN&perPage=200"
  );
  cachedBanks = data
    .filter((b) => b.active)
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  cachedAt = Date.now();
  return cachedBanks;
}

export interface PaystackBankAccountData {
  account_number: string;
  account_name: string;
}

/** Confirms an account number and bank pair and returns the real account name. */
export function resolveBankAccount(input: {
  accountNumber: string;
  bankCode: string;
}): Promise<PaystackBankAccountData> {
  return paystack<PaystackBankAccountData>(
    `/bank/resolve?account_number=${encodeURIComponent(input.accountNumber)}&bank_code=${encodeURIComponent(
      input.bankCode
    )}`
  );
}

export interface PaystackRecipientData {
  recipient_code: string;
}

/** Creates the payout recipient. No money moves. */
export function createTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<PaystackRecipientData> {
  return paystack<PaystackRecipientData>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    }),
  });
}

export interface PaystackTransferData {
  reference: string;
  status: string; // success | pending | processing | otp | failed | reversed | received
  transfer_code: string;
}

/** MOVES MONEY. Sends a payout to a saved recipient. */
export function initiateTransfer(input: {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason?: string;
}): Promise<PaystackTransferData> {
  return paystack<PaystackTransferData>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: input.amountKobo,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason ?? "Crafteey vendor payout",
    }),
  });
}

/** Asks Paystack what happened to a transfer. Read only. */
export function verifyTransfer(reference: string): Promise<PaystackTransferData> {
  return paystack<PaystackTransferData>(`/transfer/verify/${encodeURIComponent(reference)}`);
}