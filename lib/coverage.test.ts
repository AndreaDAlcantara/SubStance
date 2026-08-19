import { describe, expect, it } from "vitest";
import type { PeriodType } from "@/lib/generated/prisma/enums";
import { computeSubDaySchedule, isPeriodEligibleForJobType } from "./coverage";

const NOON = 12 * 60;

// A typical day: three morning classes, lunch, then two afternoon periods.
const periods = [
  { periodSlotId: "p1", startMinutes: 8 * 60, label: "Period 1" },
  { periodSlotId: "p2", startMinutes: 9 * 60, label: "Period 2" },
  { periodSlotId: "p3", startMinutes: 10 * 60, label: "Period 3" },
  { periodSlotId: "lunch", startMinutes: 11 * 60 + 30, label: "Lunch" },
  { periodSlotId: "p4", startMinutes: 13 * 60, label: "Period 4" },
  { periodSlotId: "p5", startMinutes: 14 * 60, label: "Period 5" },
];

function types(entries: Record<string, PeriodType>) {
  return new Map(Object.entries(entries));
}

/** A teacher who teaches four classes, with one planning period and one lunch. */
const teachesMost = types({
  p1: "CLASS",
  p2: "CLASS",
  p3: "PLANNING",
  lunch: "LUNCH",
  p4: "CLASS",
  p5: "CLASS",
});

describe("isPeriodEligibleForJobType", () => {
  it("puts a full-day sub in every period", () => {
    for (const period of periods) {
      expect(isPeriodEligibleForJobType(period, "FULL", NOON)).toBe(true);
    }
  });

  it("splits morning and afternoon subs at the school's cutoff", () => {
    const morning = periods.filter((p) => isPeriodEligibleForJobType(p, "AM", NOON));
    const afternoon = periods.filter((p) => isPeriodEligibleForJobType(p, "PM", NOON));

    expect(morning.map((p) => p.periodSlotId)).toEqual(["p1", "p2", "p3", "lunch"]);
    expect(afternoon.map((p) => p.periodSlotId)).toEqual(["p4", "p5"]);
  });

  it("treats a period starting exactly at the cutoff as afternoon", () => {
    const atCutoff = { periodSlotId: "x", startMinutes: NOON };
    expect(isPeriodEligibleForJobType(atCutoff, "AM", NOON)).toBe(false);
    expect(isPeriodEligibleForJobType(atCutoff, "PM", NOON)).toBe(true);
  });
});

describe("computeSubDaySchedule", () => {
  it("frees the sub during the covered teacher's planning and lunch", () => {
    // The whole point of the product: covering one full-day absence does not
    // consume the sub's whole day.
    const { covering, free } = computeSubDaySchedule({
      periods,
      jobType: "FULL",
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: null,
    });

    expect(covering.map((p) => p.periodSlotId)).toEqual(["p1", "p2", "p4", "p5"]);
    expect(free.map((p) => p.periodSlotId)).toEqual(["p3", "lunch"]);
  });

  it("leaves a sub with no assigned teacher free all day", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      jobType: "FULL",
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: new Map(),
      absentPeriodSlotIds: null,
    });

    expect(covering).toEqual([]);
    expect(free).toHaveLength(periods.length);
  });

  it("ignores periods outside a partial absence", () => {
    // The teacher is only out for Period 1 and Period 4, so the sub's other
    // class periods are somebody else's problem — and free for this sub.
    const { covering, free } = computeSubDaySchedule({
      periods,
      jobType: "FULL",
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: new Set(["p1", "p4"]),
    });

    expect(covering.map((p) => p.periodSlotId)).toEqual(["p1", "p4"]);
    expect(free.map((p) => p.periodSlotId)).toEqual(["p2", "p3", "lunch", "p5"]);
  });

  it("never schedules a half-day sub outside their hours", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      jobType: "AM",
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: null,
    });

    expect(covering.map((p) => p.periodSlotId)).toEqual(["p1", "p2"]);
    expect(free.map((p) => p.periodSlotId)).toEqual(["p3", "lunch"]);
    // p4 and p5 are the afternoon sub's problem, and must not appear at all.
    for (const period of [...covering, ...free]) {
      expect(["p4", "p5"]).not.toContain(period.periodSlotId);
    }
  });

  it("reports a sub as fully booked when the teacher teaches every period", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      jobType: "FULL",
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: types({
        p1: "CLASS",
        p2: "CLASS",
        p3: "CLASS",
        lunch: "CLASS",
        p4: "CLASS",
        p5: "CLASS",
      }),
      absentPeriodSlotIds: null,
    });

    expect(covering).toHaveLength(periods.length);
    expect(free).toEqual([]);
  });
});
