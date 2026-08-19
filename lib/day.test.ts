import { describe, expect, it } from "vitest";
import {
  addDaysToDayKey,
  dateToDayKey,
  dayKeyToDate,
  formatDayLong,
  isValidDayKey,
  nowMinutesInTimeZone,
  todayDayKey,
} from "./day";

describe("isValidDayKey", () => {
  it("accepts a well-formed key", () => {
    expect(isValidDayKey("2026-08-19")).toBe(true);
  });

  it("accepts a real leap day", () => {
    expect(isValidDayKey("2028-02-29")).toBe(true);
  });

  it("rejects unpadded, empty, and garbage input", () => {
    expect(isValidDayKey("2026-8-9")).toBe(false);
    expect(isValidDayKey("")).toBe(false);
    expect(isValidDayKey("not-a-date")).toBe(false);
  });

  it("rejects dates that don't exist rather than rolling them forward", () => {
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("2027-02-29")).toBe(false);
  });
});

describe("day key <-> Date", () => {
  it("round-trips through the UTC midnight Prisma stores", () => {
    expect(dateToDayKey(dayKeyToDate("2026-08-19"))).toBe("2026-08-19");
  });

  it("does not shift a day backwards when formatting", () => {
    // A @db.Date column read back from Postgres arrives as UTC midnight. Formatting
    // that in a timezone west of UTC would otherwise render the previous day.
    const fromPostgres = new Date("2026-08-19T00:00:00.000Z");
    expect(formatDayLong(dateToDayKey(fromPostgres))).toBe("Wednesday, August 19");
  });
});

describe("addDaysToDayKey", () => {
  it("crosses month, year, and negative boundaries", () => {
    expect(addDaysToDayKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysToDayKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDayKey("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("school-timezone awareness", () => {
  it("reports the school's calendar day, not the server's", () => {
    // 02:00 UTC on Aug 20 is still 21:00 on Aug 19 in Chicago. An admin opening
    // the app late at night must see the day they're actually still in.
    const at02UTC = new Date("2026-08-20T02:00:00.000Z");
    expect(todayDayKey("America/Chicago", at02UTC)).toBe("2026-08-19");
    expect(todayDayKey("UTC", at02UTC)).toBe("2026-08-20");
  });

  it("converts the current time to minutes since local midnight", () => {
    const at02UTC = new Date("2026-08-20T02:00:00.000Z");
    expect(nowMinutesInTimeZone("America/Chicago", at02UTC)).toBe(21 * 60);
    expect(nowMinutesInTimeZone("UTC", at02UTC)).toBe(2 * 60);
  });

  it("respects daylight saving offsets", () => {
    // Chicago is UTC-5 in August (CDT) but UTC-6 in January (CST).
    const summer = new Date("2026-08-19T12:00:00.000Z");
    const winter = new Date("2026-01-19T12:00:00.000Z");
    expect(nowMinutesInTimeZone("America/Chicago", summer)).toBe(7 * 60);
    expect(nowMinutesInTimeZone("America/Chicago", winter)).toBe(6 * 60);
  });
});
