"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { teacherFormSchema } from "@/lib/validation/teacher";

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function createTeacher(input: unknown): Promise<ActionState> {
  const parsed = teacherFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const school = await getOrCreateDefaultSchool();
  await prisma.teacher.create({
    data: {
      schoolId: school.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      room: parsed.data.room || null,
    },
  });

  revalidatePath("/teachers");
  return { success: true };
}

export async function updateTeacher(teacherId: string, input: unknown): Promise<ActionState> {
  const parsed = teacherFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      room: parsed.data.room || null,
    },
  });

  revalidatePath("/teachers");
  return { success: true };
}

export async function deactivateTeacher(teacherId: string): Promise<ActionState> {
  await prisma.teacher.update({ where: { id: teacherId }, data: { active: false } });
  revalidatePath("/teachers");
  return { success: true };
}
