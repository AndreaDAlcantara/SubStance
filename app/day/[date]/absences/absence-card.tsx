"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { minutesToTime } from "@/lib/time";
import { removeAbsence, setAbsenceScope } from "./actions";

export type AbsencePeriodInfo = {
  periodSlotId: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
  /** What the absent teacher normally does this period. */
  type: "CLASS" | "PLANNING" | "LUNCH" | null;
  selected: boolean;
};

export function AbsenceCard({
  dayKey,
  absenceId,
  teacherName,
  room,
  scope,
  periods,
}: {
  dayKey: string;
  absenceId: string;
  teacherName: string;
  room: string | null;
  scope: "FULL_DAY" | "PARTIAL";
  periods: AbsencePeriodInfo[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isRemoving, startRemoving] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(periods.filter((p) => p.selected).map((p) => p.periodSlotId))
  );

  const isFullDay = scope === "FULL_DAY";

  // Only teaching periods need a sub — planning and lunch don't.
  const coveredPeriodIds = isFullDay
    ? new Set(periods.map((p) => p.periodSlotId))
    : selected;
  const classesNeedingCoverage = periods.filter(
    (p) => p.type === "CLASS" && coveredPeriodIds.has(p.periodSlotId)
  ).length;

  function saveScope(periodSlotIds: string[] | null) {
    startTransition(async () => {
      const result = await setAbsenceScope(dayKey, absenceId, periodSlotIds);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex-1">
          <CardTitle>{teacherName}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {room ? `Room ${room} · ` : ""}
            {classesNeedingCoverage === 0
              ? "No classes need coverage"
              : `${classesNeedingCoverage} ${
                  classesNeedingCoverage === 1 ? "class needs" : "classes need"
                } coverage`}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRemoving}
          onClick={() => {
            startRemoving(async () => {
              const result = await removeAbsence(dayKey, absenceId);
              if (result.success) {
                toast.success(`${teacherName} is back in`);
              } else {
                toast.error(result.error ?? "Something went wrong");
              }
            });
          }}
        >
          {isRemoving ? "Removing..." : "Not out"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={isFullDay ? "default" : "outline"}
            disabled={isPending}
            onClick={() => isFullDay || saveScope(null)}
          >
            Out all day
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isFullDay ? "outline" : "default"}
            disabled={isPending}
            onClick={() => {
              if (isFullDay) {
                // Seed the period picker with the classes that actually need a sub,
                // so the common case is one click instead of eight.
                const seeded = periods
                  .filter((p) => p.type === "CLASS")
                  .map((p) => p.periodSlotId);
                if (seeded.length === 0) {
                  toast.error(`${teacherName} has no classes to cover`);
                  return;
                }
                setSelected(new Set(seeded));
                saveScope(seeded);
              }
            }}
          >
            Only certain periods
          </Button>
        </div>

        {!isFullDay && (
          <div className="flex flex-col gap-1">
            {periods.map((period) => {
              const checked = selected.has(period.periodSlotId);
              return (
                <label
                  key={period.periodSlotId}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    disabled={isPending}
                    onCheckedChange={(next) => {
                      const updated = new Set(selected);
                      if (next) updated.add(period.periodSlotId);
                      else updated.delete(period.periodSlotId);
                      setSelected(updated);
                      saveScope([...updated]);
                    }}
                  />
                  <span className="flex-1 text-sm">{period.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {minutesToTime(period.startMinutes)}–{minutesToTime(period.endMinutes)}
                  </span>
                  {period.type === "CLASS" ? (
                    <Badge variant="outline">Class</Badge>
                  ) : (
                    <Badge variant="secondary">
                      {period.type === "PLANNING"
                        ? "Planning"
                        : period.type === "LUNCH"
                          ? "Lunch"
                          : "Not set"}
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
