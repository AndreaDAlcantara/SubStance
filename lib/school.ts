import { prisma } from "@/lib/prisma";

/**
 * MVP is single-school: this returns the one School row, creating it on first
 * access. Multi-school support (Fase 6) would replace this with session/tenant lookup.
 */
export async function getOrCreateDefaultSchool() {
  const existing = await prisma.school.findFirst();
  if (existing) return existing;

  return prisma.school.create({
    data: {
      name: "My School",
      timezone: "America/Chicago",
    },
  });
}
