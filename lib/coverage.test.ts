import { describe, expect, it } from "vitest";
import type { PeriodType } from "@/lib/generated/prisma/enums";
import {
  computeCoverageNeeds,
  computeOpenGaps,
  computeSubDaySchedule,
  isPeriodEligibleForJobType,
  isSubAvailableForPeriod,
  type SubAvailability,
} from "./coverage";

const NOON = 12 * 60;

// A typical day: three morning classes, lunch, then two afternoon periods.
const periods = [
  { periodSlotId: "p1", index: 0, startMinutes: 8 * 60 },
  { periodSlotId: "p2", index: 1, startMinutes: 9 * 60 },
  { periodSlotId: "p3", index: 2, startMinutes: 10 * 60 },
  { periodSlotId: "lunch", index: 3, startMinutes: 11 * 60 + 30 },
  { periodSlotId: "p4", index: 4, startMinutes: 13 * 60 },
  { periodSlotId: "p5", index: 5, startMinutes: 14 * 60 },
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

const present: SubAvailability = {
  jobType: "FULL",
  status: "PRESENT",
  lastPeriodIndex: null,
};

const ids = (list: { periodSlotId: string }[]) => list.map((p) => p.periodSlotId);

describe("isPeriodEligibleForJobType", () => {
  it("puts a full-day sub in every period", () => {
    for (const period of periods) {
      expect(isPeriodEligibleForJobType(period, "FULL", NOON)).toBe(true);
    }
  });

  it("splits morning and afternoon subs at the school's cutoff", () => {
    expect(ids(periods.filter((p) => isPeriodEligibleForJobType(p, "AM", NOON)))).toEqual([
      "p1",
      "p2",
      "p3",
      "lunch",
    ]);
    expect(ids(periods.filter((p) => isPeriodEligibleForJobType(p, "PM", NOON)))).toEqual([
      "p4",
      "p5",
    ]);
  });

  it("treats a period starting exactly at the cutoff as afternoon", () => {
    const atCutoff = { startMinutes: NOON };
    expect(isPeriodEligibleForJobType(atCutoff, "AM", NOON)).toBe(false);
    expect(isPeriodEligibleForJobType(atCutoff, "PM", NOON)).toBe(true);
  });
});

describe("isSubAvailableForPeriod", () => {
  it("keeps a present full-day sub available throughout", () => {
    expect(periods.every((p) => isSubAvailableForPeriod(p, present, NOON))).toBe(true);
  });

  it("removes a no-show from the entire day", () => {
    const noShow: SubAvailability = { ...present, status: "NO_SHOW" };
    expect(periods.some((p) => isSubAvailableForPeriod(p, noShow, NOON))).toBe(false);
  });

  it("cuts a sub who left early off after their last period", () => {
    // Worked through Period 3 (index 2), then went home.
    const leftEarly: SubAvailability = { ...present, lastPeriodIndex: 2 };
    expect(ids(periods.filter((p) => isSubAvailableForPeriod(p, leftEarly, NOON)))).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });
});

describe("computeSubDaySchedule", () => {
  it("frees the sub during the covered teacher's planning and lunch", () => {
    // The whole point of the product: covering one full-day absence does not
    // consume the sub's whole day.
    const { covering, free } = computeSubDaySchedule({
      periods,
      availability: present,
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: null,
    });

    expect(ids(covering)).toEqual(["p1", "p2", "p4", "p5"]);
    expect(ids(free)).toEqual(["p3", "lunch"]);
  });

  it("leaves a sub with no assigned teacher free all day", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      availability: present,
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: new Map(),
      absentPeriodSlotIds: null,
    });

    expect(covering).toEqual([]);
    expect(free).toHaveLength(periods.length);
  });

  it("ignores periods outside a partial absence", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      availability: present,
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: new Set(["p1", "p4"]),
    });

    expect(ids(covering)).toEqual(["p1", "p4"]);
    expect(ids(free)).toEqual(["p2", "p3", "lunch", "p5"]);
  });

  it("never schedules a half-day sub outside their hours", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      availability: { ...present, jobType: "AM" },
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: null,
    });

    expect(ids(covering)).toEqual(["p1", "p2"]);
    expect(ids(free)).toEqual(["p3", "lunch"]);
  });

  it("gives a no-show sub nothing at all — not even free time to reassign", () => {
    const { covering, free } = computeSubDaySchedule({
      periods,
      availability: { ...present, status: "NO_SHOW" },
      middayCutoffMinutes: NOON,
      typeByPeriodSlotId: teachesMost,
      absentPeriodSlotIds: null,
    });

    expect(covering).toEqual([]);
    expect(free).toEqual([]);
  });
});

describe("computeCoverageNeeds", () => {
  const absence = {
    absenceId: "a1",
    teacherId: "t1",
    absentPeriodSlotIds: null,
    typeByPeriodSlotId: teachesMost,
  };

  it("asks for a body only in the absent teacher's class periods", () => {
    const needs = computeCoverageNeeds([absence], periods);
    expect(needs.map((n) => n.periodSlotId)).toEqual(["p1", "p2", "p4", "p5"]);
  });

  it("limits needs to the periods a partial absence covers", () => {
    const needs = computeCoverageNeeds(
      [{ ...absence, absentPeriodSlotIds: new Set(["p4", "p5", "lunch"]) }],
      periods
    );
    // lunch is in scope but needs nobody.
    expect(needs.map((n) => n.periodSlotId)).toEqual(["p4", "p5"]);
  });

  it("accumulates needs across several absent teachers", () => {
    const needs = computeCoverageNeeds(
      [
        absence,
        {
          absenceId: "a2",
          teacherId: "t2",
          absentPeriodSlotIds: new Set(["p1"]),
          typeByPeriodSlotId: types({ p1: "CLASS" }),
        },
      ],
      periods
    );
    expect(needs).toHaveLength(5);
    expect(needs.filter((n) => n.absenceId === "a2")).toHaveLength(1);
  });
});

describe("computeOpenGaps", () => {
  const needs = computeCoverageNeeds(
    [
      {
        absenceId: "a1",
        teacherId: "t1",
        absentPeriodSlotIds: null,
        typeByPeriodSlotId: teachesMost,
      },
    ],
    periods
  );

  it("reports everything as open when nobody is assigned", () => {
    expect(computeOpenGaps(needs, [])).toHaveLength(4);
  });

  it("closes the periods somebody is already covering", () => {
    const gaps = computeOpenGaps(needs, [
      { absenceId: "a1", periodId: "p1" },
      { absenceId: "a1", periodId: "p2" },
    ]);
    expect(gaps.map((g) => g.periodSlotId)).toEqual(["p4", "p5"]);
  });

  it("does not count coverage of a different teacher's absence", () => {
    // Same period, different absence — this does not fill our gap.
    const gaps = computeOpenGaps(needs, [{ absenceId: "a2", periodId: "p1" }]);
    expect(gaps).toHaveLength(4);
  });

  it("goes empty once every class is covered", () => {
    const gaps = computeOpenGaps(
      needs,
      needs.map((n) => ({ absenceId: n.absenceId, periodId: n.periodSlotId }))
    );
    expect(gaps).toEqual([]);
  });
});
