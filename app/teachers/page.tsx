import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddTeacherDialog } from "./add-teacher-dialog";
import { EditTeacherDialog } from "./edit-teacher-dialog";
import { DeactivateTeacherButton } from "./teacher-row-actions";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const school = await getOrCreateDefaultSchool();
  const [teachers, periodCount] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId: school.id, active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { periodAssignments: true } } },
    }),
    prisma.periodSlot.count({ where: { schoolId: school.id } }),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
            <p className="text-muted-foreground text-sm">
              Add teachers and set their daily schedule.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/teachers/upload"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Upload instead
            </Link>
            <AddTeacherDialog />
          </div>
        </div>

        {periodCount === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Set up your{" "}
            <Link href="/school/bell-schedule" className="underline">
              bell schedule
            </Link>{" "}
            first — teacher schedules are built on top of it.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {teachers.map((teacher) => {
            const hasFullSchedule =
              periodCount > 0 && teacher._count.periodAssignments >= periodCount;
            return (
              <Card key={teacher.id}>
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <Link href={`/teachers/${teacher.id}/schedule`} className="flex-1">
                    <CardTitle>{teacher.name}</CardTitle>
                    <CardDescription>
                      {teacher.email}
                      {teacher.room ? ` · Room ${teacher.room}` : ""}
                    </CardDescription>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={hasFullSchedule ? "secondary" : "outline"}>
                      {periodCount === 0
                        ? "No bell schedule"
                        : hasFullSchedule
                          ? "Schedule set"
                          : "Needs schedule"}
                    </Badge>
                    <EditTeacherDialog
                      teacherId={teacher.id}
                      teacher={{
                        name: teacher.name,
                        email: teacher.email,
                        phone: teacher.phone,
                        room: teacher.room,
                      }}
                    />
                    <DeactivateTeacherButton teacherId={teacher.id} teacherName={teacher.name} />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
          {teachers.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No teachers yet — click &quot;Add teacher&quot; to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
