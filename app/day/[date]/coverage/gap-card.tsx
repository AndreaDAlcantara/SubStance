"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneLink } from "@/components/phone-link";
import { minutesToTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { assignCoverage } from "./actions";

export type FreeSubOption = {
  subDayEntryId: string;
  substituteName: string;
  phone: string | null;
  extraPeriodsToday: number;
};

export function GapCard({
  dayKey,
  absenceId,
  periodSlotId,
  periodLabel,
  startMinutes,
  endMinutes,
  teacherName,
  room,
  subjectLabel,
  freeSubs,
  isNow,
  isPast,
}: {
  dayKey: string;
  absenceId: string;
  periodSlotId: string;
  periodLabel: string;
  startMinutes: number;
  endMinutes: number;
  teacherName: string;
  room: string | null;
  subjectLabel: string | null;
  freeSubs: FreeSubOption[];
  isNow: boolean;
  isPast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  // Least-loaded first, so the obvious pick is also the fair one.
  const ranked = [...freeSubs].sort(
    (a, b) =>
      a.extraPeriodsToday - b.extraPeriodsToday ||
      a.substituteName.localeCompare(b.substituteName)
  );

  function assign(subDayEntryId: string, name: string) {
    startTransition(async () => {
      const result = await assignCoverage(dayKey, absenceId, periodSlotId, subDayEntryId);
      if (result.success) {
        toast.success(`${name} covering ${periodLabel}`);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Card
      className={cn(
        isNow && "ring-2 ring-destructive/40",
        isPast && "opacity-60"
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {periodLabel}
            {isNow && <Badge variant="destructive">Happening now</Badge>}
            {isPast && <Badge variant="secondary">Already passed</Badge>}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {minutesToTime(startMinutes)}–{minutesToTime(endMinutes)} · {teacherName}
            {room ? ` · Room ${room}` : ""}
            {subjectLabel ? ` · ${subjectLabel}` : ""}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {ranked.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nobody in the building is free this period. You&apos;ll need to pull someone
            in from outside.
          </p>
        ) : (
          ranked.map((sub) => (
            <div
              key={sub.subDayEntryId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-2.5"
            >
              <span className="text-sm font-medium">{sub.substituteName}</span>
              <Badge variant={sub.extraPeriodsToday === 0 ? "secondary" : "outline"}>
                {sub.extraPeriodsToday === 0
                  ? "No extras yet"
                  : `${sub.extraPeriodsToday} extra ${
                      sub.extraPeriodsToday === 1 ? "period" : "periods"
                    } today`}
              </Badge>
              <PhoneLink phone={sub.phone} className="text-muted-foreground" />
              <Button
                type="button"
                size="sm"
                className="ml-auto"
                disabled={isPending}
                onClick={() => assign(sub.subDayEntryId, sub.substituteName)}
              >
                Assign
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
