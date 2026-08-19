import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { getOrCreateDefaultBellSchedule } from "@/lib/bell-schedule";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellScheduleForm } from "./bell-schedule-form";
import { AddBellScheduleDialog } from "./add-bell-schedule-dialog";

export const dynamic = "force-dynamic";

export default async function BellSchedulePage() {
  const school = await getOrCreateDefaultSchool();
  const defaultSchedule = await getOrCreateDefaultBellSchedule(school.id);

  const [periodSlots, bellSchedules] = await Promise.all([
    prisma.periodSlot.findMany({
      where: { schoolId: school.id },
      orderBy: { index: "asc" },
      include: {
        bellSchedulePeriods: { where: { bellScheduleId: defaultSchedule.id } },
      },
    }),
    prisma.bellSchedule.findMany({
      where: { schoolId: school.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const otherSchedules = bellSchedules.filter((s) => !s.isDefault);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bell schedule</h1>
            <p className="text-muted-foreground text-sm">
              Set your school&apos;s periods and times. Teachers&apos; schedules are built on
              top of this. The number and order of periods is the same for every schedule
              below — only the times differ.
            </p>
          </div>
          <Link
            href="/school/bell-schedule/upload"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Upload instead
          </Link>
        </div>

        <BellScheduleForm
          schoolName={school.name}
          timezone={school.timezone}
          periods={periodSlots.map((p) => ({
            id: p.id,
            label: p.label,
            startMinutes: p.bellSchedulePeriods[0]?.startMinutes ?? 0,
            endMinutes: p.bellSchedulePeriods[0]?.endMinutes ?? 0,
          }))}
        />

        <div className="flex flex-col gap-3 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Other schedules</h2>
              <p className="text-muted-foreground text-sm">
                For exam weeks, assemblies, or other days with different period times.
              </p>
            </div>
            <AddBellScheduleDialog />
          </div>

          <div className="flex flex-col gap-2">
            {otherSchedules.map((s) => (
              <Link key={s.id} href={`/school/bell-schedule/variants/${s.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                    <div>
                      <CardTitle>{s.name}</CardTitle>
                      <CardDescription>Same periods, different times</CardDescription>
                    </div>
                    <Badge variant="outline">Edit times</Badge>
                  </CardHeader>
                </Card>
              </Link>
            ))}
            {otherSchedules.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No other schedules yet. Add one for exam weeks or special days.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
