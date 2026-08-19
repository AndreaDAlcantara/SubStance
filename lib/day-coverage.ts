import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDayPeriods, type DayPeriod } from "@/lib/school-day";
import { dayKeyToDate } from "@/lib/day";
import {
  computeCoverageNeeds,
  computeOpenGaps,
  computeSubDaySchedule,
  isSubAvailableForPeriod,
  type CoverageNeed,
  type SubAvailability,
} from "@/lib/coverage";

/**
 * Resolving a day's coverage.
 *
 * Planned coverage — the sub the teacher or admin lined up in advance — is *derived*,
 * never stored: it follows from who's out, who's subbing, and the day's periods. Only
 * emergency reassignments get rows in `CoverageAssignment`, because those are decisions
 * this app made and nothing else knows about.
 *
 * Keeping it that way means planned coverage can't go stale when a bell schedule is
 * edited or a sub goes home; it's recomputed from current facts every time.
 */

async function loadDay(schoolId: string, dayKey: string) {
  const date = dayKeyToDate(dayKey);

  const [periods, absences, subDayEntries, reassignments, school] = await Promise.all([
    getDayPeriods(schoolId, dayKey),
    prisma.absence.findMany({
      where: { schoolId, date },
      include: {
        teacher: { include: { periodAssignments: true } },
        periods: true,
      },
    }),
    prisma.subDayEntry.findMany({
      where: { schoolId, date },
      include: { substitute: true },
    }),
    prisma.coverageAssignment.findMany({ where: { date } }),
    prisma.school.findUniqueOrThrow({ where: { id: schoolId } }),
  ]);

  return { periods, absences, subDayEntries, reassignments, school };
}

type LoadedDay = Awaited<ReturnType<typeof loadDay>>;
type LoadedAbsence = LoadedDay["absences"][number];
type LoadedSubEntry = LoadedDay["subDayEntries"][number];

function absentPeriodIds(absence: LoadedAbsence): Set<string> | null {
  return absence.scope === "FULL_DAY"
    ? null
    : new Set(absence.periods.map((p) => p.periodId));
}

function availabilityOf(entry: LoadedSubEntry, periods: DayPeriod[]): SubAvailability {
  const lastIndex = entry.lastPeriodId
    ? (periods.find((p) => p.periodSlotId === entry.lastPeriodId)?.index ?? null)
    : null;
  return { jobType: entry.jobType, status: entry.status, lastPeriodIndex: lastIndex };
}

/** Refresh the day's pages after a change. */
export async function afterDayChange(_schoolId: string, dayKey: string): Promise<void> {
  revalidatePath(`/day/${dayKey}`, "layout");
}

export type GapView = CoverageNeed & {
  period: DayPeriod;
  teacherName: string;
  room: string | null;
  subjectLabel: string | null;
};

export type FreeSubView = {
  subDayEntryId: string;
  substituteName: string;
  phone: string | null;
  subId: string | null;
  /** Periods taken on beyond their own teacher's classes — the fairness signal. */
  extraPeriodsToday: number;
  freePeriodSlotIds: Set<string>;
};

export type CoveredView = {
  /** Only emergency reassignments can be undone; planned coverage has no row. */
  assignmentId: string | null;
  periodSlotId: string;
  absenceId: string;
  period: DayPeriod;
  teacherName: string;
  room: string | null;
  substituteName: string;
  phone: string | null;
  isReassignment: boolean;
};

/** Everything the emergency screen needs: what's uncovered, and who could cover it. */
export async function getDayCoverage(schoolId: string, dayKey: string) {
  const { periods, absences, subDayEntries, reassignments, school } = await loadDay(
    schoolId,
    dayKey
  );

  const absenceById = new Map(absences.map((a) => [a.id, a]));
  const periodById = new Map(periods.map((p) => [p.periodSlotId, p]));

  // An emergency reassignment wins over the planned sub for that slot: the admin
  // deliberately put somebody else in that room.
  const reassignedNeedKeys = new Set(
    reassignments.map((r) => `${r.absenceId}:${r.periodId}`)
  );

  type Covering = { periodSlotId: string; absenceId: string; entryId: string };
  const plannedCoverage: Covering[] = [];

  for (const entry of subDayEntries) {
    if (!entry.primaryAbsenceId) continue;
    const absence = absenceById.get(entry.primaryAbsenceId);
    if (!absence) continue;

    const { covering } = computeSubDaySchedule({
      periods,
      availability: availabilityOf(entry, periods),
      middayCutoffMinutes: school.middayCutoffMinutes,
      typeByPeriodSlotId: new Map(
        absence.teacher.periodAssignments.map((pa) => [pa.periodId, pa.type])
      ),
      absentPeriodSlotIds: absentPeriodIds(absence),
    });

    for (const period of covering) {
      if (reassignedNeedKeys.has(`${absence.id}:${period.periodSlotId}`)) continue;
      plannedCoverage.push({
        periodSlotId: period.periodSlotId,
        absenceId: absence.id,
        entryId: entry.id,
      });
    }
  }

  const needs = computeCoverageNeeds(
    absences.map((absence) => ({
      absenceId: absence.id,
      teacherId: absence.teacherId,
      absentPeriodSlotIds: absentPeriodIds(absence),
      typeByPeriodSlotId: new Map(
        absence.teacher.periodAssignments.map((pa) => [pa.periodId, pa.type])
      ),
    })),
    periods
  );

  const filled = [
    ...plannedCoverage.map((c) => ({ absenceId: c.absenceId, periodId: c.periodSlotId })),
    ...reassignments.map((r) => ({ absenceId: r.absenceId, periodId: r.periodId })),
  ];
  const openGaps = computeOpenGaps(needs, filled);

  function describe(absenceId: string, periodSlotId: string) {
    const absence = absenceById.get(absenceId);
    const assignment = absence?.teacher.periodAssignments.find(
      (pa) => pa.periodId === periodSlotId
    );
    return {
      teacherName: absence?.teacher.name ?? "Unknown",
      room: assignment?.room ?? absence?.teacher.room ?? null,
      subjectLabel: assignment?.subjectLabel ?? null,
    };
  }

  const gaps: GapView[] = openGaps
    .map((need) => ({
      ...need,
      period: periodById.get(need.periodSlotId)!,
      ...describe(need.absenceId, need.periodSlotId),
    }))
    .sort((a, b) => a.period.index - b.period.index);

  // Which periods each sub is already spoken for, planned or reassigned.
  const busyByEntry = new Map<string, Set<string>>();
  const addBusy = (entryId: string, periodSlotId: string) => {
    const set = busyByEntry.get(entryId) ?? new Set<string>();
    set.add(periodSlotId);
    busyByEntry.set(entryId, set);
  };
  for (const c of plannedCoverage) addBusy(c.entryId, c.periodSlotId);
  for (const r of reassignments) addBusy(r.subDayEntryId, r.periodId);

  const extraByEntry = new Map<string, number>();
  for (const r of reassignments) {
    extraByEntry.set(r.subDayEntryId, (extraByEntry.get(r.subDayEntryId) ?? 0) + 1);
  }

  const freeSubs: FreeSubView[] = subDayEntries
    .map((entry) => {
      const availability = availabilityOf(entry, periods);
      const busy = busyByEntry.get(entry.id) ?? new Set<string>();

      return {
        subDayEntryId: entry.id,
        substituteName: entry.substitute.name,
        phone: entry.substitute.phone,
        subId: entry.substitute.subId,
        extraPeriodsToday: extraByEntry.get(entry.id) ?? 0,
        freePeriodSlotIds: new Set(
          periods
            .filter(
              (period) =>
                isSubAvailableForPeriod(period, availability, school.middayCutoffMinutes) &&
                !busy.has(period.periodSlotId)
            )
            .map((p) => p.periodSlotId)
        ),
      };
    })
    .sort((a, b) => a.substituteName.localeCompare(b.substituteName));

  const subByEntry = new Map(
    subDayEntries.map((e) => [e.id, { name: e.substitute.name, phone: e.substitute.phone }])
  );

  const covered: CoveredView[] = [
    ...plannedCoverage.map((c) => ({
      assignmentId: null,
      periodSlotId: c.periodSlotId,
      absenceId: c.absenceId,
      entryId: c.entryId,
      isReassignment: false,
    })),
    ...reassignments.map((r) => ({
      assignmentId: r.id,
      periodSlotId: r.periodId,
      absenceId: r.absenceId,
      entryId: r.subDayEntryId,
      isReassignment: true,
    })),
  ]
    .flatMap((row) => {
      const period = periodById.get(row.periodSlotId);
      if (!period) return [];
      return [
        {
          assignmentId: row.assignmentId,
          periodSlotId: row.periodSlotId,
          absenceId: row.absenceId,
          period,
          substituteName: subByEntry.get(row.entryId)?.name ?? "Unknown",
          phone: subByEntry.get(row.entryId)?.phone ?? null,
          isReassignment: row.isReassignment,
          ...describe(row.absenceId, row.periodSlotId),
        },
      ];
    })
    .sort((a, b) => a.period.index - b.period.index);

  return { periods, gaps, freeSubs, covered, needs, absences, subDayEntries, school };
}
