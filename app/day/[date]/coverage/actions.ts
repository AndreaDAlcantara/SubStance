"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getDayPeriods } from "@/lib/school-day";
import { afterDayChange } from "@/lib/day-coverage";
import { isSubAvailableForPeriod } from "@/lib/coverage";
import { dayKeyToDate, isValidDayKey } from "@/lib/day";

export type ActionState = {
  success: boolean;
  error?: string;
};

/** Hands an open period to a sub who's free for it — the emergency fix. */
export async function assignCoverage(
  dayKey: string,
  absenceId: string,
  periodSlotId: string,
  subDayEntryId: string
): Promise<ActionState> {
  if (!isValidDayKey(dayKey)) return { success: false, error: "Invalid date" };

  const school = await getOrCreateDefaultSchool();
  const date = dayKeyToDate(dayKey);

  const [entry, periods] = await Promise.all([
    prisma.subDayEntry.findUnique({
      where: { id: subDayEntryId },
      include: { substitute: true },
    }),
    getDayPeriods(school.id, dayKey),
  ]);
  if (!entry) return { success: false, error: "Substitute not on today's list" };

  const period = periods.find((p) => p.periodSlotId === periodSlotId);
  if (!period) return { success: false, error: "Period not found" };

  const lastPeriodIndex = entry.lastPeriodId
    ? (periods.find((p) => p.periodSlotId === entry.lastPeriodId)?.index ?? null)
    : null;

  // Re-check on the server: the page may have been open a while, and the sub could
  // have gone home or been given this period in another tab since it rendered.
  const available = isSubAvailableForPeriod(
    period,
    { jobType: entry.jobType, status: entry.status, lastPeriodIndex },
    school.middayCutoffMinutes
  );
  if (!available) {
    return {
      success: false,
      error: `${entry.substitute.name} isn't available for ${period.label}`,
    };
  }

  const [alreadyCovered, alreadyBusy] = await Promise.all([
    prisma.coverageAssignment.findUnique({
      where: { absenceId_periodId: { absenceId, periodId: periodSlotId } },
    }),
    prisma.coverageAssignment.findUnique({
      where: { subDayEntryId_periodId: { subDayEntryId, periodId: periodSlotId } },
    }),
  ]);
  if (alreadyCovered) {
    return { success: false, error: "Somebody is already covering that class" };
  }
  if (alreadyBusy) {
    return {
      success: false,
      error: `${entry.substitute.name} is already booked for ${period.label}`,
    };
  }

  await prisma.coverageAssignment.create({
    data: { date, periodId: periodSlotId, absenceId, subDayEntryId, source: "SLACK" },
  });

  await afterDayChange(school.id, dayKey);
  return { success: true };
}

export async function unassignCoverage(
  dayKey: string,
  assignmentId: string
): Promise<ActionState> {
  const assignment = await prisma.coverageAssignment.findUnique({
    where: { id: assignmentId },
    include: { subDayEntry: true },
  });
  if (!assignment) return { success: false, error: "Assignment not found" };

  await prisma.coverageAssignment.delete({ where: { id: assignmentId } });
  await afterDayChange(assignment.subDayEntry.schoolId, dayKey);
  return { success: true };
}
