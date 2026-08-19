import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getDayPeriods } from "@/lib/school-day";
import { dayKeyToDate } from "@/lib/day";
import { AbsenceCard, type AbsencePeriodInfo } from "./absence-card";
import { MarkAbsentPicker } from "./mark-absent-picker";

export const dynamic = "force-dynamic";

export default async function AbsencesPage({ params }: PageProps<"/day/[date]/absences">) {
  const { date: dayKey } = await params;
  const school = await getOrCreateDefaultSchool();

  const [teachers, absences, dayPeriods] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId: school.id, active: true },
      orderBy: { name: "asc" },
      include: { periodAssignments: true },
    }),
    prisma.absence.findMany({
      where: { schoolId: school.id, date: dayKeyToDate(dayKey) },
      include: { periods: true },
    }),
    getDayPeriods(school.id, dayKey),
  ]);

  const absentTeacherIds = new Set(absences.map((a) => a.teacherId));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));

  const absenceCards = absences
    .map((absence) => {
      const teacher = teacherById.get(absence.teacherId);
      if (!teacher) return null;

      const typeBySlot = new Map(
        teacher.periodAssignments.map((pa) => [pa.periodId, pa.type])
      );
      const selectedSlots = new Set(absence.periods.map((p) => p.periodId));

      const periods: AbsencePeriodInfo[] = dayPeriods.map((period) => ({
        periodSlotId: period.periodSlotId,
        label: period.label,
        startMinutes: period.startMinutes,
        endMinutes: period.endMinutes,
        type: typeBySlot.get(period.periodSlotId) ?? null,
        selected: selectedSlots.has(period.periodSlotId),
      }));

      return { absence, teacher, periods };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));

  const totalClassesNeedingCoverage = absenceCards.reduce((sum, { absence, periods }) => {
    const inScope =
      absence.scope === "FULL_DAY"
        ? periods
        : periods.filter((p) => p.selected);
    return sum + inScope.filter((p) => p.type === "CLASS").length;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      {teachers.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          Add your{" "}
          <Link href="/teachers" className="underline">
            teachers
          </Link>{" "}
          first — you mark absences against them.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Who&apos;s out today?</h2>
            <MarkAbsentPicker
              dayKey={dayKey}
              availableTeachers={teachers
                .filter((t) => !absentTeacherIds.has(t.id))
                .map((t) => ({ id: t.id, name: t.name }))}
            />
          </div>

          {absenceCards.length > 0 && (
            <p className="text-sm">
              <span className="font-medium">
                {totalClassesNeedingCoverage}{" "}
                {totalClassesNeedingCoverage === 1 ? "class" : "classes"}
              </span>{" "}
              <span className="text-muted-foreground">
                need coverage across {absenceCards.length}{" "}
                {absenceCards.length === 1 ? "teacher" : "teachers"}.
              </span>
            </p>
          )}

          <div className="flex flex-col gap-3">
            {absenceCards.map(({ absence, teacher, periods }) => (
              <AbsenceCard
                key={absence.id}
                dayKey={dayKey}
                absenceId={absence.id}
                teacherName={teacher.name}
                room={teacher.room}
                scope={absence.scope}
                periods={periods}
              />
            ))}
            {absenceCards.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nobody marked out yet. Pick a teacher above to start.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
