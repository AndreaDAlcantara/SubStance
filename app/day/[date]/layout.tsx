import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getEffectiveBellSchedule } from "@/lib/school-day";
import { addDaysToDayKey, formatDayLong, isValidDayKey, todayDayKey } from "@/lib/day";
import { Badge } from "@/components/ui/badge";
import { DaySchedulePicker } from "./day-schedule-picker";
import { DaySteps } from "./day-steps";

export const dynamic = "force-dynamic";

export default async function DayLayout({
  children,
  params,
}: LayoutProps<"/day/[date]">) {
  const { date: dayKey } = await params;
  if (!isValidDayKey(dayKey)) notFound();

  const school = await getOrCreateDefaultSchool();
  const [{ schedule: activeSchedule }, bellSchedules] = await Promise.all([
    getEffectiveBellSchedule(school.id, dayKey),
    prisma.bellSchedule.findMany({
      where: { schoolId: school.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  const isToday = dayKey === todayDayKey(school.timezone);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {formatDayLong(dayKey)}
              </h1>
              {isToday && <Badge variant="secondary">Today</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link
                href={`/day/${addDaysToDayKey(dayKey, -1)}/absences`}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Previous day
              </Link>
              <span className="text-muted-foreground/40">|</span>
              <Link
                href={`/day/${addDaysToDayKey(dayKey, 1)}/absences`}
                className="text-muted-foreground hover:text-foreground"
              >
                Next day →
              </Link>
            </div>
          </div>

          <DaySchedulePicker
            dayKey={dayKey}
            bellSchedules={bellSchedules}
            activeBellScheduleId={activeSchedule.id}
          />

          <DaySteps dayKey={dayKey} />
        </div>

        {children}
      </div>
    </div>
  );
}
