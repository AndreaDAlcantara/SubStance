import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { todayDayKey, formatDayLong } from "@/lib/day";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const school = await getOrCreateDefaultSchool();
  const dayKey = todayDayKey(school.timezone);

  const [periodCount, teacherCount, substituteCount] = await Promise.all([
    prisma.periodSlot.count({ where: { schoolId: school.id } }),
    prisma.teacher.count({ where: { schoolId: school.id, active: true } }),
    prisma.substitute.count({ where: { schoolId: school.id, active: true } }),
  ]);

  const setupSteps = [
    {
      title: "Bell schedule",
      description: "Set your school's periods and times.",
      href: "/school/bell-schedule",
      done: periodCount > 0,
    },
    {
      title: "Teachers",
      description: "Add teachers and their daily schedule.",
      href: "/teachers",
      done: teacherCount > 0,
    },
    {
      title: "Substitutes",
      description: "Keep a directory of subs you can call on.",
      href: "/substitutes",
      done: substituteCount > 0,
    },
  ];

  const readyToRun = setupSteps.every((step) => step.done);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{school.name}</h1>
          <p className="text-muted-foreground text-lg">
            Get more coverage out of the subs you already have today.
          </p>
        </div>

        {readyToRun && (
          <div className="flex flex-col gap-3 rounded-xl border p-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">Today is {formatDayLong(dayKey)}</h2>
              <p className="text-muted-foreground text-sm">
                Mark who&apos;s out, then line up your subs.
              </p>
            </div>
            <Link href={`/day/${dayKey}/absences`} className={cn(buttonVariants(), "w-fit")}>
              Set up today
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-sm font-medium">Setup</h2>
          {setupSteps.map((step, i) => (
            <Link key={step.href} href={step.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      step.done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <div className="flex-1">
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                  {!step.done && <Badge variant="outline">To do</Badge>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
