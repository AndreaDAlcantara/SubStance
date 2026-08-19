"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";

export type ConfirmUploadRow = {
  teacherName: string;
  email: string;
  room?: string;
  periodId: string;
  type: "CLASS" | "PLANNING" | "LUNCH";
  subjectLabel?: string;
};

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function confirmTeacherScheduleUpload(rows: ConfirmUploadRow[]): Promise<ActionState> {
  if (rows.length === 0) {
    return { success: false, error: "Nothing to save" };
  }

  const school = await getOrCreateDefaultSchool();

  await prisma.$transaction(async (tx) => {
    const byEmail = new Map<string, { name: string; room?: string }>();
    for (const row of rows) {
      if (!byEmail.has(row.email)) byEmail.set(row.email, { name: row.teacherName, room: row.room });
    }

    const teacherIdByEmail = new Map<string, string>();
    for (const [email, info] of byEmail) {
      const teacher = await tx.teacher.upsert({
        where: { schoolId_email: { schoolId: school.id, email } },
        create: { schoolId: school.id, name: info.name, email, room: info.room || null },
        update: { name: info.name, room: info.room || null },
      });
      teacherIdByEmail.set(email, teacher.id);
    }

    for (const row of rows) {
      const teacherId = teacherIdByEmail.get(row.email)!;
      await tx.teacherPeriodAssignment.upsert({
        where: { teacherId_periodId: { teacherId, periodId: row.periodId } },
        create: {
          teacherId,
          periodId: row.periodId,
          type: row.type,
          subjectLabel: row.subjectLabel || null,
        },
        update: { type: row.type, subjectLabel: row.subjectLabel || null },
      });
    }
  });

  revalidatePath("/teachers");
  return { success: true };
}
