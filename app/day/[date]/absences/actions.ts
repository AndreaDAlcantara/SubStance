"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { dayKeyToDate, isValidDayKey } from "@/lib/day";

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function markTeacherAbsent(
  dayKey: string,
  teacherId: string
): Promise<ActionState> {
  if (!isValidDayKey(dayKey)) return { success: false, error: "Invalid date" };

  const school = await getOrCreateDefaultSchool();
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.schoolId !== school.id) {
    return { success: false, error: "Teacher not found" };
  }

  const date = dayKeyToDate(dayKey);
  const existing = await prisma.absence.findUnique({
    where: { teacherId_date: { teacherId, date } },
  });
  if (existing) {
    return { success: false, error: `${teacher.name} is already marked out` };
  }

  await prisma.absence.create({
    data: { schoolId: school.id, teacherId, date, scope: "FULL_DAY" },
  });

  revalidatePath(`/day/${dayKey}`, "layout");
  return { success: true };
}

export async function removeAbsence(dayKey: string, absenceId: string): Promise<ActionState> {
  await prisma.absence.delete({ where: { id: absenceId } });
  revalidatePath(`/day/${dayKey}`, "layout");
  return { success: true };
}

/** Switches an absence between full-day and a specific set of periods. An empty
 * period list is rejected — that's "not absent", which is what removing is for. */
export async function setAbsenceScope(
  dayKey: string,
  absenceId: string,
  periodSlotIds: string[] | null
): Promise<ActionState> {
  const absence = await prisma.absence.findUnique({ where: { id: absenceId } });
  if (!absence) return { success: false, error: "Absence not found" };

  if (periodSlotIds !== null && periodSlotIds.length === 0) {
    return { success: false, error: "Pick at least one period, or remove the absence" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.absencePeriod.deleteMany({ where: { absenceId } });

    if (periodSlotIds === null) {
      await tx.absence.update({ where: { id: absenceId }, data: { scope: "FULL_DAY" } });
    } else {
      await tx.absence.update({ where: { id: absenceId }, data: { scope: "PARTIAL" } });
      await tx.absencePeriod.createMany({
        data: periodSlotIds.map((periodId) => ({ absenceId, periodId })),
      });
    }
  });

  revalidatePath(`/day/${dayKey}`, "layout");
  return { success: true };
}
