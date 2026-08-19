"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { substituteFormSchema } from "@/lib/validation/substitute";

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function createSubstitute(input: unknown): Promise<ActionState> {
  const parsed = substituteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const school = await getOrCreateDefaultSchool();
  await prisma.substitute.create({
    data: {
      schoolId: school.id,
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

  await prisma.substitute.update({
    where: { id: substituteId },
    data: {
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
