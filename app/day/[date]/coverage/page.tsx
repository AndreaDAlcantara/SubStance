import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getDayCoverage } from "@/lib/day-coverage";
import { nowMinutesInTimeZone, todayDayKey } from "@/lib/day";
import { Badge } from "@/components/ui/badge";
import { GapCard } from "./gap-card";
import { CoveredRow } from "./covered-row";
import { EmergencyActions } from "./emergency-actions";

export const dynamic = "force-dynamic";

export default async function CoveragePage({ params }: PageProps<"/day/[date]/coverage">) {
  const { date: dayKey } = await params;
  const school = await getOrCreateDefaultSchool();

  const [{ periods, gaps, freeSubs, covered, absences, subDayEntries }, allTeachers] =
    await Promise.all([
      getDayCoverage(school.id, dayKey),
      prisma.teacher.findMany({
        where: { schoolId: school.id, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  const absentTeacherIds = new Set(absences.map((a) => a.teacherId));

  // "Now" only means something on the day you're actually living through.
  const isToday = dayKey === todayDayKey(school.timezone);
  const nowMinutes = isToday ? nowMinutesInTimeZone(school.timezone) : null;

  const currentPeriodId =
    nowMinutes === null
      ? null
      : (periods.find((p) => nowMinutes >= p.startMinutes && nowMinutes < p.endMinutes)
          ?.periodSlotId ?? null);

  const reassignedCount = covered.filter((row) => row.isReassignment).length;

  return (
    <div className="flex flex-col gap-6">
      <EmergencyActions
        dayKey={dayKey}
        periods={periods.map((p) => ({
          periodSlotId: p.periodSlotId,
          label: p.label,
          index: p.index,
        }))}
        subsOnDuty={subDayEntries.map((e) => ({
          subDayEntryId: e.id,
          name: e.substitute.name,
          status: e.status,
          lastPeriodId: e.lastPeriodId,
        }))}
        teachers={allTeachers.map((t) => ({
          teacherId: t.id,
          name: t.name,
          alreadyOut: absentTeacherIds.has(t.id),
        }))}
      />

      {gaps.length === 0 ? (
        <div className="rounded-xl border border-dashed p-5">
          <p className="font-medium">
            {covered.length === 0
              ? "Nothing needs covering right now."
              : "Every class is covered."}
          </p>
          <p className="text-muted-foreground text-sm">
            {covered.length === 0 ? (
              <>
                Mark who&apos;s out on{" "}
                <Link href={`/day/${dayKey}/absences`} className="underline">
                  Who&apos;s out
                </Link>{" "}
                and gaps will show up here.
              </>
            ) : (
              "If something changes, use the buttons above and this page will show the new gaps."
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {gaps.length} {gaps.length === 1 ? "class needs" : "classes need"} someone
            </h2>
            {freeSubs.length > 0 && (
              <span className="text-muted-foreground text-sm">
                — {freeSubs.length} {freeSubs.length === 1 ? "sub" : "subs"} in the building
              </span>
            )}
          </div>

          {gaps.map((gap) => (
            <GapCard
              key={`${gap.absenceId}:${gap.periodSlotId}`}
              dayKey={dayKey}
              absenceId={gap.absenceId}
              periodSlotId={gap.periodSlotId}
              periodLabel={gap.period.label}
              startMinutes={gap.period.startMinutes}
              endMinutes={gap.period.endMinutes}
              teacherName={gap.teacherName}
              room={gap.room}
              subjectLabel={gap.subjectLabel}
              isNow={gap.periodSlotId === currentPeriodId}
              isPast={nowMinutes !== null && gap.period.endMinutes <= nowMinutes}
              freeSubs={freeSubs
                .filter((sub) => sub.freePeriodSlotIds.has(gap.periodSlotId))
                .map((sub) => ({
                  subDayEntryId: sub.subDayEntryId,
                  substituteName: sub.substituteName,
                  phone: sub.phone,
                  extraPeriodsToday: sub.extraPeriodsToday,
                }))}
            />
          ))}
        </div>
      )}

      {covered.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Covered</h2>
            {reassignedCount > 0 && (
              <Badge variant="outline">
                {reassignedCount} reassigned{" "}
                {reassignedCount === 1 ? "period" : "periods"}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {covered.map((row) => (
              <CoveredRow
                key={`${row.absenceId}:${row.periodSlotId}`}
                dayKey={dayKey}
                assignmentId={row.assignmentId}
                periodLabel={row.period.label}
                startMinutes={row.period.startMinutes}
                endMinutes={row.period.endMinutes}
                teacherName={row.teacherName}
                room={row.room}
                substituteName={row.substituteName}
                phone={row.phone}
                isReassignment={row.isReassignment}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
