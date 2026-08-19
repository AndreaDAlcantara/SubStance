import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultBellSchedule } from "@/lib/bell-schedule";
import { TeacherScheduleForm } from "./teacher-schedule-form";

export const dynamic = "force-dynamic";

export default async function TeacherSchedulePage({
  params,
}: PageProps<"/teachers/[id]/schedule">) {
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const defaultSchedule = await getOrCreateDefaultBellSchedule(teacher.schoolId);

  const [periodSlots, existing] = await Promise.all([
    prisma.periodSlot.findMany({
      where: { schoolId: teacher.schoolId },
      orderBy: { index: "asc" },
      include: { bellSchedulePeriods: { where: { bellScheduleId: defaultSchedule.id } } },
    }),
    prisma.teacherPeriodAssignment.findMany({ where: { teacherId: id } }),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/teachers" className="text-muted-foreground text-sm hover:underline">
            ← Teachers
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{teacher.name}&apos;s schedule</h1>
          <p className="text-muted-foreground text-sm">
            Set what {teacher.name} does each period — class, planning, or lunch. This applies
            no matter which bell schedule is running that day.
          </p>
        </div>

        {periodSlots.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Set up your{" "}
            <Link href="/school/bell-schedule" className="underline">
              bell schedule
            </Link>{" "}
            first — teacher schedules are built on top of it.
          </p>
        ) : (
          <TeacherScheduleForm
            teacherId={id}
            periods={periodSlots.map((p) => ({
              id: p.id,
              label: p.label,
              startMinutes: p.bellSchedulePeriods[0]?.startMinutes ?? 0,
              endMinutes: p.bellSchedulePeriods[0]?.endMinutes ?? 0,
            }))}
            existing={existing.map((e) => ({
              periodId: e.periodId,
              type: e.type,
              subjectLabel: e.subjectLabel,
            }))}
          />
        )}
      </div>
    </div>
  );
}
