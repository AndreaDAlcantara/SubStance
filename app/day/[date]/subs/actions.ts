"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { afterDayChange } from "@/lib/day-coverage";
import { dayKeyToDate, isValidDayKey } from "@/lib/day";
import type { JobType, SubDayStatus } from "@/lib/generated/prisma/enums";

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function addSubToDay(
  dayKey: string,
  substituteId: string,
  jobType: JobType
): Promise<ActionState> {
  if (!isValidDayKey(dayKey)) return { success: false, error: "Invalid date" };

  const school = await getOrCreateDefaultSchool();
  const substitute = await prisma.substitute.findUnique({ where: { id: substituteId } });
  if (!substitute || substitute.schoolId !== school.id) {
    return { success: false, error: "Substitute not found" };
  }

  const date = dayKeyToDate(dayKey);
  const existing = await prisma.subDayEntry.findUnique({
    where: { substituteId_date: { substituteId, date } },
  });
  if (existing) {
    return { success: false, error: `${substitute.name} is already on today's list` };
  }

  await prisma.subDayEntry.create({
    data: { schoolId: school.id, substituteId, date, jobType },
  });

  await afterDayChange(school.id, dayKey);
  return { success: true };
}

export async function removeSubFromDay(
  dayKey: string,
  subDayEntryId: string
): Promise<ActionState> {
  const entry = await prisma.subDayEntry.findUnique({ where: { id: subDayEntryId } });
  if (!entry) return { success: false, error: "Not found" };

  await prisma.subDayEntry.delete({ where: { id: subDayEntryId } });
  await afterDayChange(entry.schoolId, dayKey);
  return { success: true };
}

export async function updateSubDayEntry(
  dayKey: string,
  subDayEntryId: string,
  data: {
    jobType?: JobType;
    primaryAbsenceId?: string | null;
    status?: SubDayStatus;
    lastPeriodId?: string | null;
  }
): Promise<ActionState> {
  const entry = await prisma.subDayEntry.findUnique({ where: { id: subDayEntryId } });
  if (!entry) return { success: false, error: "Not found" };

  if (data.primaryAbsenceId) {
    // One sub per absent teacher: two subs both "primarily covering" the same
    // teacher would each inherit the same schedule and double-book the room.
    const taken = await prisma.subDayEntry.findFirst({
      where: {
        primaryAbsenceId: data.primaryAbsenceId,
        date: entry.date,
        id: { not: subDayEntryId },
      },
      include: { substitute: true },
    });
    if (taken) {
      return {
        success: false,
        error: `${taken.substitute.name} is already covering that teacher`,
      };
    }
  }

  await prisma.subDayEntry.update({
    where: { id: subDayEntryId },
    data: {
      ...(data.jobType ? { jobType: data.jobType } : {}),
      ...(data.primaryAbsenceId !== undefined
        ? { primaryAbsenceId: data.primaryAbsenceId }
        : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.lastPeriodId !== undefined ? { lastPeriodId: data.lastPeriodId } : {}),
    },
  });

  await afterDayChange(entry.schoolId, dayKey);
  return { success: true };
}
