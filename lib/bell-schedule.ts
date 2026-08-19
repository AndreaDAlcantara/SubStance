import { prisma } from "@/lib/prisma";

/** The "Regular Day" schedule every school gets automatically — the fallback used
 * whenever a date has no explicit SchoolDay override. */
export async function getOrCreateDefaultBellSchedule(schoolId: string) {
  const existing = await prisma.bellSchedule.findFirst({
    where: { schoolId, isDefault: true },
  });
  if (existing) return existing;

  return prisma.bellSchedule.create({
    data: { schoolId, name: "Regular Day", isDefault: true },
  });
}
