"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getDayPeriods } from "@/lib/school-day";
import { afterDayChange } from "@/lib/day-coverage";
import { dayKeyToDate, isValidDayKey } from "@/lib/day";

export type EmergencyResult = {
  success: boolean;
  error?: string;
  message?: string;
};

/**
 * A teacher is suddenly unavailable — either gone for the rest of the day, or
 * stepping out for one period. Both land as a partial absence; the difference is
 * only which periods it spans.
 */
export async function teacherLeaving(
  dayKey: string,
  teacherId: string,
  fromPeriodSlotId: string,
  restOfDay: boolean
): Promise<EmergencyResult> {
  if (!isValidDayKey(dayKey)) return { success: false, error: "Invalid date" };

  const school = await getOrCreateDefaultSchool();
  const [teacher, periods] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    getDayPeriods(school.id, dayKey),
  ]);
  if (!teacher || teacher.schoolId !== school.id) {
    return { success: false, error: "Teacher not found" };
  }

  const from = periods.find((p) => p.periodSlotId === fromPeriodSlotId);
  if (!from) return { success: false, error: "Period not found" };

  const affected = restOfDay
    ? periods.filter((p) => p.index >= from.index)
    : [from];

  const date = dayKeyToDate(dayKey);
  const existing = await prisma.absence.findUnique({
    where: { teacherId_date: { teacherId, date } },
  });
  if (existing) {
    return { success: false, error: `${teacher.name} is already marked out today` };
  }

  await prisma.absence.create({
    data: {
      schoolId: school.id,
      teacherId,
      date,
      scope: "PARTIAL",
      periods: { create: affected.map((p) => ({ periodId: p.periodSlotId })) },
    },
  });

  await afterDayChange(school.id, dayKey);
  return {
    success: true,
    message: restOfDay
      ? `${teacher.name} is out from ${from.label} on`
      : `${teacher.name} is out for ${from.label}`,
  };
}

/** The sub never turned up — everything they were down to cover reopens. */
export async function subNoShow(
  dayKey: string,
  subDayEntryId: string
): Promise<EmergencyResult> {
  const entry = await prisma.subDayEntry.findUnique({
    where: { id: subDayEntryId },
    include: { substitute: true },
  });
  if (!entry) return { success: false, error: "Substitute not on today's list" };

  await prisma.$transaction(async (tx) => {
    await tx.subDayEntry.update({
      where: { id: subDayEntryId },
      data: { status: "NO_SHOW" },
    });
    // Includes any emergency reassignments they'd picked up — they're not here.
    await tx.coverageAssignment.deleteMany({ where: { subDayEntryId } });
  });

  await afterDayChange(entry.schoolId, dayKey);
  return { success: true, message: `${entry.substitute.name} marked as a no-show` };
}

/** The sub went home partway through — anything after their last period reopens. */
export async function subLeftEarly(
  dayKey: string,
  subDayEntryId: string,
  lastPeriodSlotId: string
): Promise<EmergencyResult> {
  const entry = await prisma.subDayEntry.findUnique({
    where: { id: subDayEntryId },
    include: { substitute: true },
  });
  if (!entry) return { success: false, error: "Substitute not on today's list" };

  const periods = await getDayPeriods(entry.schoolId, dayKey);
  const last = periods.find((p) => p.periodSlotId === lastPeriodSlotId);
  if (!last) return { success: false, error: "Period not found" };

  const droppedIds = periods
    .filter((p) => p.index > last.index)
    .map((p) => p.periodSlotId);

  await prisma.$transaction(async (tx) => {
    await tx.subDayEntry.update({
      where: { id: subDayEntryId },
      data: { lastPeriodId: lastPeriodSlotId },
    });
    if (droppedIds.length > 0) {
      await tx.coverageAssignment.deleteMany({
        where: { subDayEntryId, periodId: { in: droppedIds } },
      });
    }
  });

  await afterDayChange(entry.schoolId, dayKey);
  return {
    success: true,
    message: `${entry.substitute.name} worked through ${last.label}`,
  };
}
