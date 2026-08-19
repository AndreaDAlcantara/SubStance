"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getOrCreateDefaultBellSchedule } from "@/lib/bell-schedule";
import { bellScheduleFormSchema } from "@/lib/validation/bell-schedule";
import { timeToMinutes } from "@/lib/time";

export type SaveBellScheduleState = {
  success: boolean;
  error?: string;
};

/** Saves the school's canonical period structure (label/order) and the "Regular Day"
 * schedule's times for those periods. Other bell schedule variants keep their own times. */
export async function saveBellSchedule(input: unknown): Promise<SaveBellScheduleState> {
  const parsed = bellScheduleFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const rows = parsed.data.periods
    .map((p) => ({
      ...p,
      startMinutes: timeToMinutes(p.startTime),
      endMinutes: timeToMinutes(p.endTime),
    }))
    .sort((a, b) => a.startMinutes - b.startMinutes);

  for (const p of rows) {
    if (p.endMinutes <= p.startMinutes) {
      return { success: false, error: `"${p.label}" end time must be after its start time` };
    }
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].startMinutes < rows[i - 1].endMinutes) {
      return {
        success: false,
        error: `"${rows[i].label}" overlaps with "${rows[i - 1].label}"`,
      };
    }
  }

  const school = await getOrCreateDefaultSchool();
  const defaultSchedule = await getOrCreateDefaultBellSchedule(school.id);

  await prisma.$transaction(async (tx) => {
    await tx.school.update({
      where: { id: school.id },
      data: { name: parsed.data.schoolName, timezone: parsed.data.timezone },
    });

    const existing = await tx.periodSlot.findMany({ where: { schoolId: school.id } });
    const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id!));
    const toDelete = existing.filter((p) => !keepIds.has(p.id));
    if (toDelete.length > 0) {
      await tx.periodSlot.deleteMany({ where: { id: { in: toDelete.map((p) => p.id) } } });
    }

    // Two-pass reindex: push kept rows to a collision-free offset first, since
    // (schoolId, index) is unique and a single-pass update can collide mid-transaction.
    const kept = rows.filter((r) => r.id);
    await Promise.all(
      kept.map((r, i) =>
        tx.periodSlot.update({ where: { id: r.id! }, data: { index: 100000 + i } })
      )
    );

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const periodSlot = r.id
        ? await tx.periodSlot.update({
            where: { id: r.id },
            data: { index: i, label: r.label },
          })
        : await tx.periodSlot.create({
            data: { schoolId: school.id, index: i, label: r.label },
          });

      await tx.bellSchedulePeriod.upsert({
        where: {
          bellScheduleId_periodSlotId: {
            bellScheduleId: defaultSchedule.id,
            periodSlotId: periodSlot.id,
          },
        },
        create: {
          bellScheduleId: defaultSchedule.id,
          periodSlotId: periodSlot.id,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
        },
        update: { startMinutes: r.startMinutes, endMinutes: r.endMinutes },
      });
    }
  });

  revalidatePath("/school/bell-schedule");
  revalidatePath("/teachers");
  revalidatePath("/");
  return { success: true };
}

export type CreateBellScheduleState = {
  success: boolean;
  error?: string;
  bellScheduleId?: string;
};

/** Creates a new bell schedule variant, seeded with the default schedule's current
 * times for every period — the admin then only needs to adjust what's different. */
export async function createBellScheduleVariant(name: string): Promise<CreateBellScheduleState> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Name is required" };
  }

  const school = await getOrCreateDefaultSchool();
  const defaultSchedule = await getOrCreateDefaultBellSchedule(school.id);

  const existing = await prisma.bellSchedule.findUnique({
    where: { schoolId_name: { schoolId: school.id, name: trimmed } },
  });
  if (existing) {
    return { success: false, error: `A schedule named "${trimmed}" already exists` };
  }

  const defaultTimes = await prisma.bellSchedulePeriod.findMany({
    where: { bellScheduleId: defaultSchedule.id },
  });

  const variant = await prisma.bellSchedule.create({
    data: {
      schoolId: school.id,
      name: trimmed,
      isDefault: false,
      periods: {
        create: defaultTimes.map((t) => ({
          periodSlotId: t.periodSlotId,
          startMinutes: t.startMinutes,
          endMinutes: t.endMinutes,
        })),
      },
    },
  });

  revalidatePath("/school/bell-schedule");
  return { success: true, bellScheduleId: variant.id };
}
