import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultBellSchedule } from "@/lib/bell-schedule";
import { dayKeyToDate } from "@/lib/day";

export type DayPeriod = {
  periodSlotId: string;
  index: number;
  label: string;
  startMinutes: number;
  endMinutes: number;
};

/** Which bell schedule runs on a given date: the SchoolDay override if the admin
 * set one, otherwise the school's default ("Regular Day"). */
export async function getEffectiveBellSchedule(schoolId: string, dayKey: string) {
  const override = await prisma.schoolDay.findUnique({
    where: { schoolId_date: { schoolId, date: dayKeyToDate(dayKey) } },
    include: { bellSchedule: true },
  });
  if (override) {
    return { schedule: override.bellSchedule, isOverride: true };
  }
  return { schedule: await getOrCreateDefaultBellSchedule(schoolId), isOverride: false };
}

/** The day's periods with the times actually in effect for that date. */
export async function getDayPeriods(schoolId: string, dayKey: string): Promise<DayPeriod[]> {
  const { schedule } = await getEffectiveBellSchedule(schoolId, dayKey);

  const periodSlots = await prisma.periodSlot.findMany({
    where: { schoolId },
    orderBy: { index: "asc" },
    include: { bellSchedulePeriods: { where: { bellScheduleId: schedule.id } } },
  });

  return periodSlots.map((slot) => ({
    periodSlotId: slot.id,
    index: slot.index,
    label: slot.label,
    startMinutes: slot.bellSchedulePeriods[0]?.startMinutes ?? 0,
    endMinutes: slot.bellSchedulePeriods[0]?.endMinutes ?? 0,
  }));
}
