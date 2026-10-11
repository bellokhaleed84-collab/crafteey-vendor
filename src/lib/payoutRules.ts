// Payout rules in one place. Change days or minimum here only.

// 0 = Sunday ... 6 = Saturday, in Lagos time.
export const WITHDRAWAL_WEEKDAYS: readonly number[] = [1, 4]; // Monday, Thursday

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

// Testing switch, same idea as the rider app. Set ALLOW_WITHDRAWALS_ANY_DAY=true
// to ignore the day rule. Leave it unset for real use.
export function anyDayAllowed(): boolean {
  return process.env.ALLOW_WITHDRAWALS_ANY_DAY === "true";
}