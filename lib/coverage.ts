import type { JobType, PeriodType } from "@/lib/generated/prisma/enums";

/**
 * Coverage rules. The heart of the product: a sub assigned to an absent teacher
 * only actually works that teacher's *class* periods. Planning and lunch periods
 * leave the sub free, and the admin can spend that time covering someone else.
 *
 * The full assignment board builds on these in a later phase.
 */

export type PeriodTiming = {
  periodSlotId: string;
  startMinutes: number;
};

/** Whether a half-day sub is around for a given period. */
export function isPeriodEligibleForJobType(
  period: PeriodTiming,
  jobType: JobType,
  middayCutoffMinutes: number
): boolean {
  if (jobType === "FULL") return true;
  if (jobType === "AM") return period.startMinutes < middayCutoffMinutes;
  return period.startMinutes >= middayCutoffMinutes;
}

export type SubDayScheduleInput<P extends PeriodTiming> = {
  periods: P[];
  jobType: JobType;
  middayCutoffMinutes: number;
  /** What the covered teacher does each period. Missing = nothing scheduled. */
  typeByPeriodSlotId: Map<string, PeriodType>;
  /** Periods the absence actually covers. `null` means the whole day. */
  absentPeriodSlotIds: Set<string> | null;
};

/**
 * Splits a sub's day into the periods they're actually teaching and the periods
 * they're free — the slack this app exists to surface.
 *
 * A sub with no teacher assigned yet is free for every period they're around for.
 */
export function computeSubDaySchedule<P extends PeriodTiming>({
  periods,
  jobType,
  middayCutoffMinutes,
  typeByPeriodSlotId,
  absentPeriodSlotIds,
}: SubDayScheduleInput<P>): { covering: P[]; free: P[] } {
  const eligible = periods.filter((period) =>
    isPeriodEligibleForJobType(period, jobType, middayCutoffMinutes)
  );

  const covering = eligible.filter((period) => {
    const inScope =
      absentPeriodSlotIds === null || absentPeriodSlotIds.has(period.periodSlotId);
    return inScope && typeByPeriodSlotId.get(period.periodSlotId) === "CLASS";
  });

  const coveringIds = new Set(covering.map((p) => p.periodSlotId));
  const free = eligible.filter((period) => !coveringIds.has(period.periodSlotId));

  return { covering, free };
}
