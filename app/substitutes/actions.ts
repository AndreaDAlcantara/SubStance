"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { substituteFormSchema } from "@/lib/validation/substitute";

export type ActionState = {
  success: boolean;
  error?: string;
};

/** Sub IDs come from an outside system, so a typo'd duplicate is a real possibility
 * — catch it here rather than letting the unique index surface a database error. */
async function findSubIdConflict(
  schoolId: string,
  subId: string | null,
  excludeSubstituteId?: string
): Promise<string | null> {
  if (!subId) return null;
  const clash = await prisma.substitute.findFirst({
    where: {
      schoolId,
      subId,
      ...(excludeSubstituteId ? { id: { not: excludeSubstituteId } } : {}),
    },
  });
  return clash ? `Sub ID ${subId} already belongs to ${clash.name}` : null;
}

export async function createSubstitute(input: unknown): Promise<ActionState> {
  const parsed = substituteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const school = await getOrCreateDefaultSchool();
  const subId = parsed.data.subId || null;

  const conflict = await findSubIdConflict(school.id, subId);
  if (conflict) return { success: false, error: conflict };

  await prisma.substitute.create({
    data: {
      schoolId: school.id,
      subId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/substitutes");
  return { success: true };
}

export async function updateSubstitute(
  substituteId: string,
  input: unknown
): Promise<ActionState> {
  const parsed = substituteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const existing = await prisma.substitute.findUnique({ where: { id: substituteId } });
  if (!existing) return { success: false, error: "Substitute not found" };

  const subId = parsed.data.subId || null;
  const conflict = await findSubIdConflict(existing.schoolId, subId, substituteId);
  if (conflict) return { success: false, error: conflict };

  await prisma.substitute.update({
    where: { id: substituteId },
    data: {
      subId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/substitutes");
  return { success: true };
}

export async function deactivateSubstitute(substituteId: string): Promise<ActionState> {
  await prisma.substitute.update({
    where: { id: substituteId },
    data: { active: false },
  });
  revalidatePath("/substitutes");
  return { success: true };
}
