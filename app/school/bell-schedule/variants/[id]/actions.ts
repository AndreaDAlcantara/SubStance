"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/time";
import { bellScheduleVariantFormSchema } from "@/lib/validation/bell-schedule-variant";

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function saveBellScheduleVariant(
  bellScheduleId: string,
  input: unknown
): Promise<ActionState> {
  const parsed = bellScheduleVariantFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const rows = parsed.data.times.map((t) => ({
    ...t,
    startMinutes: timeToMinutes(t.startTime),
    endMinutes: timeToMinutes(t.endTime),
  }));

  for (const r of rows) {
    if (r.endMinutes <= r.startMinutes) {
      return { success: false, error: "End time must be after start time" };
    }
  }

  const periodSlots = await prisma.periodSlot.findMany({
    where: { id: { in: rows.map((r) => r.periodSlotId) } },
  });
  const indexById = new Map(periodSlots.map((p) => [p.id, p.index]));
  const sorted = [...rows].sort(
    (a, b) => (indexById.get(a.periodSlotId) ?? 0) - (indexById.get(b.periodSlotId) ?? 0)
  );
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMinutes < sorted[i - 1].endMinutes) {
      return { success: false, error: "Periods can't overlap" };
    }
  }

  await prisma.$transaction(
    rows.map((r) =>
      prisma.bellSchedulePeriod.upsert({
        where: {
          bellScheduleId_periodSlotId: { bellScheduleId, periodSlotId: r.periodSlotId },
        },
        create: {
          bellScheduleId,
          periodSlotId: r.periodSlotId,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
        },
        update: { startMinutes: r.startMinutes, endMinutes: r.endMinutes },
      })
    )
  );

  revalidatePath(`/school/bell-schedule/variants/${bellScheduleId}`);
  revalidatePath("/school/bell-schedule");
  return { success: true };
}

export async function deleteBellScheduleVariant(bellScheduleId: string): Promise<ActionState> {
  const schedule = await prisma.bellSchedule.findUnique({ where: { id: bellScheduleId } });
  if (!schedule) {
    return { success: false, error: "Schedule not found" };
  }
  if (schedule.isDefault) {
    return { success: false, error: "Can't delete the default schedule" };
  }

  await prisma.bellSchedule.delete({ where: { id: bellScheduleId } });
  revalidatePath("/school/bell-schedule");
  return { success: true };
}
