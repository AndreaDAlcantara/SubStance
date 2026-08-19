import type { JobType, PeriodType, SubDayStatus } from "@/lib/generated/prisma/enums";

/**
 * Coverage rules. The heart of the product: a sub assigned to an absent teacher
 * only actually works that teacher's *class* periods. Planning and lunch periods
 * leave the sub free, and the admin can spend that time covering someone else
 * when the day goes wrong.
 *
 * Pure functions over plain data — the database layer does the fetching.
 */

export type PeriodRef = {
  periodSlotId: string;
  index: number;
  startMinutes: number;
};

export type SubAvailability = {
  jobType: JobType;
  status: SubDayStatus;
  /** Index of the last period they worked before leaving. Null = here all day. */
  lastPeriodIndex: number | null;
};

/** Whether a half-day sub is around for a given period. */
export function isPeriodEligibleForJobType(
  period: Pick<PeriodRef, "startMinutes">,
  jobType: JobType,
  middayCutoffMinutes: number
): boolean {
  if (jobType === "FULL") return true;
  if (jobType === "AM") return period.startMinutes < middayCutoffMinutes;
  return period.startMinutes >= middayCutoffMinutes;
}

/**
 * Whether the sub is actually in the building for a period — their booked hours,
 * minus the two ways a sub falls through on the day: never showing up, or leaving
 * partway through.
 */
export function isSubAvailableForPeriod(
  period: PeriodRef,
  availability: SubAvailability,
  middayCutoffMinutes: number
): boolean {
  if (availability.status === "NO_SHOW") return false;
  if (availability.lastPeriodIndex !== null && period.index > availability.lastPeriodIndex) {
    return false;
  }
  return isPeriodEligibleForJobType(period, availability.jobType, middayCutoffMinutes);
}

export type SubDayScheduleInput<P extends PeriodRef> = {
  periods: P[];
  availability: SubAvailability;
  middayCutoffMinutes: number;
  /** What the covered teacher does each period. Missing = nothing scheduled. */
  typeByPeriodSlotId: Map<string, PeriodType>;
  /** Periods the absence actually covers. `null` means the whole day. */
  absentPeriodSlotIds: Set<string> | null;
};

/**
 * Splits a sub's day into the periods they're teaching and the periods they're
 * free — the slack this app exists to surface.
 *
 * A sub with no teacher assigned is free for every period they're around for.
 */
export function computeSubDaySchedule<P extends PeriodRef>({
  periods,
  availability,
  middayCutoffMinutes,
  typeByPeriodSlotId,
  absentPeriodSlotIds,
}: SubDayScheduleInput<P>): { covering: P[]; free: P[] } {
  const present = periods.filter((period) =>
    isSubAvailableForPeriod(period, availability, middayCutoffMinutes)
  );

  const covering = present.filter((period) => {
    const inScope =
      absentPeriodSlotIds === null || absentPeriodSlotIds.has(period.periodSlotId);
    return inScope && typeByPeriodSlotId.get(period.periodSlotId) === "CLASS";
  });

  const coveringIds = new Set(covering.map((p) => p.periodSlotId));
  const free = present.filter((period) => !coveringIds.has(period.periodSlotId));

  return { covering, free };
}

export type AbsenceForNeeds = {
  absenceId: string;
  teacherId: string;
  /** Null means out the whole day. */
  absentPeriodSlotIds: Set<string> | null;
  typeByPeriodSlotId: Map<string, PeriodType>;
};

export type CoverageNeed = {
  absenceId: string;
  teacherId: string;
  periodSlotId: string;
};

/**
 * Every (absence, period) pair that needs a body in the room. Only class periods
 * count — an absent teacher's planning and lunch need nobody.
 */
export function computeCoverageNeeds(
  absences: AbsenceForNeeds[],
  periods: PeriodRef[]
): CoverageNeed[] {
  const needs: CoverageNeed[] = [];

  for (const absence of absences) {
    for (const period of periods) {
      const inScope =
        absence.absentPeriodSlotIds === null ||
        absence.absentPeriodSlotIds.has(period.periodSlotId);
      if (!inScope) continue;
      if (absence.typeByPeriodSlotId.get(period.periodSlotId) !== "CLASS") continue;

      needs.push({
        absenceId: absence.absenceId,
        teacherId: absence.teacherId,
        periodSlotId: period.periodSlotId,
      });
    }
  }

  return needs;
}

const needKey = (absenceId: string, periodSlotId: string) => `${absenceId}:${periodSlotId}`;

/** The needs nobody is covering — the gaps the admin has to close. */
export function computeOpenGaps(
  needs: CoverageNeed[],
  filled: { absenceId: string; periodId: string }[]
): CoverageNeed[] {
  const filledKeys = new Set(filled.map((f) => needKey(f.absenceId, f.periodId)));
  return needs.filter((need) => !filledKeys.has(needKey(need.absenceId, need.periodSlotId)));
}
