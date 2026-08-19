import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultBellSchedule } from "@/lib/bell-schedule";
import { VariantTimesForm } from "./variant-times-form";

export const dynamic = "force-dynamic";

export default async function BellScheduleVariantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const schedule = await prisma.bellSchedule.findUnique({ where: { id } });
  if (!schedule) notFound();

  const [periodSlots, defaultSchedule] = await Promise.all([
    prisma.periodSlot.findMany({
      where: { schoolId: schedule.schoolId },
      orderBy: { index: "asc" },
      include: { bellSchedulePeriods: { where: { bellScheduleId: id } } },
    }),
    getOrCreateDefaultBellSchedule(schedule.schoolId),
  ]);

  // Periods added to Regular Day after this variant was created won't have a time
  // here yet — fall back to the default schedule's time so the form always has a value.
  const fallbackTimes = schedule.isDefault
    ? []
    : await prisma.bellSchedulePeriod.findMany({
        where: { bellScheduleId: defaultSchedule.id },
      });
  const fallbackBySlot = new Map(fallbackTimes.map((t) => [t.periodSlotId, t]));

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link
            href="/school/bell-schedule"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Bell schedule
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{schedule.name}</h1>
          <p className="text-muted-foreground text-sm">
            Same periods as Regular Day — just adjust the times that differ.
          </p>
        </div>

        <VariantTimesForm
          bellScheduleId={id}
          periods={periodSlots.map((p) => {
            const own = p.bellSchedulePeriods[0];
            const fallback = fallbackBySlot.get(p.id);
            return {
              periodSlotId: p.id,
              label: p.label,
              startMinutes: own?.startMinutes ?? fallback?.startMinutes ?? 0,
              endMinutes: own?.endMinutes ?? fallback?.endMinutes ?? 0,
            };
          })}
        />
      </div>
    </div>
  );
}
