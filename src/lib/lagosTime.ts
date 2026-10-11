// Nigeria is UTC+1 all year, so Lagos time is a fixed one-hour shift.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

function shifted(now: Date): Date {
  return new Date(now.getTime() + LAGOS_OFFSET_MS);
}

/** "YYYY-MM-DD" for the Lagos calendar day. */
export function lagosDayString(now: Date = new Date()): string {
  return shifted(now).toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday, in Lagos time. */
export function lagosWeekday(now: Date = new Date()): number {
  return shifted(now).getUTCDay();
}