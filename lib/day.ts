import { formatInTimeZone } from "date-fns-tz";

/**
 * A "day key" is a calendar date with no time or zone: `YYYY-MM-DD`. It's what
 * appears in URLs (`/day/2026-08-19/...`).
 *
 * Prisma `@db.Date` columns round-trip through UTC midnight, so that's what we
 * store. Everything here goes through UTC deliberately: formatting a day key in
 * a local zone west of UTC would render the previous day.
 */

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDayKey(dayKey: string): boolean {
  if (!DAY_KEY_RE.test(dayKey)) return false;
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  // Rejects things like 2026-02-30, which Date would otherwise roll forward.
  return !Number.isNaN(date.getTime()) && dateToDayKey(date) === dayKey;
}

/** The Date to hand Prisma for a `@db.Date` column. */
export function dayKeyToDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function dateToDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's date as the school sees it — not as the server's clock sees it. */
export function todayDayKey(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** e.g. "Wednesday, August 19" */
export function formatDayLong(dayKey: string): string {
  return formatInTimeZone(dayKeyToDate(dayKey), "UTC", "EEEE, MMMM d");
}

/** e.g. "Aug 19, 2026" */
export function formatDayShort(dayKey: string): string {
  return formatInTimeZone(dayKeyToDate(dayKey), "UTC", "MMM d, yyyy");
}

export function addDaysToDayKey(dayKey: string, days: number): string {
  const date = dayKeyToDate(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToDayKey(date);
}

/** Minutes since midnight in the school's timezone — pairs with period start/end times. */
export function nowMinutesInTimeZone(timezone: string, now: Date = new Date()): number {
  const [h, m] = formatInTimeZone(now, timezone, "HH:mm").split(":").map(Number);
  return h * 60 + m;
}
