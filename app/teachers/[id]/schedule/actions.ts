"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { teacherScheduleFormSchema } from "@/lib/validation/teacher-schedule";

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function saveTeacherSchedule(
  teacherId: string,
  input: unknown
): Promise<ActionState> {
  const parsed = teacherScheduleFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await prisma.$transaction(
    parsed.data.assignments.map((row) =>
      prisma.teacherPeriodAssignment.upsert({
        where: { teacherId_periodId: { teacherId, periodId: row.periodId } },
        create: {
          teacherId,
          periodId: row.periodId,
          type: row.type,
          subjectLabel: row.type === "CLASS" ? row.subjectLabel || null : null,
        },
        update: {
          type: row.type,
          subjectLabel: row.type === "CLASS" ? row.subjectLabel || null : null,
        },
      })
    )
  );

  revalidatePath(`/teachers/${teacherId}/schedule`);
  revalidatePath("/teachers");
  return { success: true };
}
