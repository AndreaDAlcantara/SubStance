"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { dayKeyToDate, isValidDayKey } from "@/lib/day";

export type ActionState = {
  success: boolean;
  error?: string;
};

/** Sets which bell schedule runs on a date. Passing the default schedule clears
 * the override rather than storing a row that says "use the default". */
export async function setDayBellSchedule(
  dayKey: string,
  bellScheduleId: string
): Promise<ActionState> {
  if (!isValidDayKey(dayKey)) {
    return { success: false, error: "Invalid date" };
  }

  const school = await getOrCreateDefaultSchool();
  const schedule = await prisma.bellSchedule.findUnique({ where: { id: bellScheduleId } });
  if (!schedule || schedule.schoolId !== school.id) {
    return { success: false, error: "Schedule not found" };
  }

  const date = dayKeyToDate(dayKey);

  if (schedule.isDefault) {
    await prisma.schoolDay.deleteMany({ where: { schoolId: school.id, date } });
  } else {
    await prisma.schoolDay.upsert({
      where: { schoolId_date: { schoolId: school.id, date } },
      create: { schoolId: school.id, date, bellScheduleId },
      update: { bellScheduleId },
    });
  }

  revalidatePath(`/day/${dayKey}`, "layout");
  return { success: true };
}
