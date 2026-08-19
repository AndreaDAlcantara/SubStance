import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getDayPeriods } from "@/lib/school-day";
import { dayKeyToDate } from "@/lib/day";
import { computeSubDaySchedule } from "@/lib/coverage";
import { buttonVariants } from "@/components/ui/button";
import { AddSubPicker } from "./add-sub-picker";
import { SubDayCard } from "./sub-day-card";

export const dynamic = "force-dynamic";

export default async function SubsPage({ params }: PageProps<"/day/[date]/subs">) {
  const { date: dayKey } = await params;
  const school = await getOrCreateDefaultSchool();
  const date = dayKeyToDate(dayKey);

  const [substitutes, subDayEntries, absences, dayPeriods] = await Promise.all([
    prisma.substitute.findMany({
      where: { schoolId: school.id, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.subDayEntry.findMany({
      where: { schoolId: school.id, date },
      include: { substitute: true },
    }),
    prisma.absence.findMany({
      where: { schoolId: school.id, date },
      include: {
        teacher: { include: { periodAssignments: true } },
        periods: true,
      },
    }),
    getDayPeriods(school.id, dayKey),
  ]);

  const absenceById = new Map(absences.map((a) => [a.id, a]));
  const scheduledIds = new Set(subDayEntries.map((e) => e.substituteId));

  const absenceOptions = absences
    .map((a) => ({ absenceId: a.id, teacherName: a.teacher.name }))
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  const cards = subDayEntries
    .map((entry) => {
      const absence = entry.primaryAbsenceId
        ? absenceById.get(entry.primaryAbsenceId)
        : undefined;

      const lastPeriodIndex = entry.lastPeriodId
        ? (dayPeriods.find((p) => p.periodSlotId === entry.lastPeriodId)?.index ?? null)
        : null;

      const { covering, free } = computeSubDaySchedule({
        periods: dayPeriods,
        availability: {
          jobType: entry.jobType,
          status: entry.status,
          lastPeriodIndex,
        },
        middayCutoffMinutes: school.middayCutoffMinutes,
        typeByPeriodSlotId: new Map(
          absence?.teacher.periodAssignments.map((pa) => [pa.periodId, pa.type]) ?? []
        ),
        absentPeriodSlotIds:
          absence && absence.scope === "PARTIAL"
            ? new Set(absence.periods.map((p) => p.periodId))
            : null,
      });

      return { entry, covering, free };
    })
    .sort((a, b) => a.entry.substitute.name.localeCompare(b.entry.substitute.name));

  const totalFreePeriods = cards.reduce(
    (sum, card) => sum + (card.entry.primaryAbsenceId ? card.free.length : 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {substitutes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          Add people to your{" "}
          <Link href="/substitutes" className="underline">
            substitute list
          </Link>{" "}
          first — then you can pick who&apos;s working each day.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Who&apos;s subbing today?</h2>
            <Link
              href={`/day/${dayKey}/subs/upload`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Upload today&apos;s list
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              Or add someone by hand:
            </p>
            <AddSubPicker
              dayKey={dayKey}
              availableSubstitutes={substitutes
                .filter((s) => !scheduledIds.has(s.id))
                .map((s) => ({ id: s.id, name: s.name }))}
            />
          </div>

          {absences.length === 0 && cards.length > 0 && (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              Nobody is marked out yet, so there&apos;s nothing to assign these subs to.{" "}
              <Link href={`/day/${dayKey}/absences`} className="underline">
                Mark who&apos;s out
              </Link>
              .
            </p>
          )}

          {totalFreePeriods > 0 && (
            <p className="text-sm">
              <span className="font-medium">
                {totalFreePeriods} spare {totalFreePeriods === 1 ? "period" : "periods"}
              </span>{" "}
              <span className="text-muted-foreground">
                across your subs — time you can point at other classes.
              </span>
            </p>
          )}

          <div className="flex flex-col gap-3">
            {cards.map(({ entry, covering, free }) => (
              <SubDayCard
                key={entry.id}
                dayKey={dayKey}
                subDayEntryId={entry.id}
                substituteName={entry.substitute.name}
                jobType={entry.jobType}
                primaryAbsenceId={entry.primaryAbsenceId}
                absenceOptions={absenceOptions}
                coveringCount={covering.length}
                freePeriodLabels={free.map((p) => p.label)}
              />
            ))}
            {cards.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No substitutes scheduled yet. Pick someone above to start.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
