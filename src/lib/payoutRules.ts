// Payout rules in one place. Change days or minimum here only.

// 0 = Sunday ... 6 = Saturday, in Lagos time.
// Every day is allowed. The "once a day" limit is enforced separately
// (one payout per Lagos calendar day), so this list stays all 7 days.
export const WITHDRAWAL_WEEKDAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

// Smallest payout we will send: 1,000 naira, in kobo.
export const MIN_PAYOUT_KOBO = 100000;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Text for the Wallet screen: "any day" when all 7 are allowed.
export function daysLabel(): string {
  if (WITHDRAWAL_WEEKDAYS.length >= 7) return "any day";
  const names = WITHDRAWAL_WEEKDAYS.map((d) => WEEKDAY_NAMES[d]);
  if (names.length <= 1) return names.join("");
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

// Testing switch, same idea as the rider app. Set ALLOW_WITHDRAWALS_ANY_DAY=true
// to ignore the day rule. Not needed now that every day is allowed.
export function anyDayAllowed(): boolean {
  return process.env.ALLOW_WITHDRAWALS_ANY_DAY === "true";
}