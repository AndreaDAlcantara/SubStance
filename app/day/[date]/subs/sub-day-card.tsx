"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobType } from "@/lib/generated/prisma/enums";
import { removeSubFromDay, updateSubDayEntry } from "./actions";
import { JOB_TYPE_LABELS, UNASSIGNED } from "./labels";

export function SubDayCard({
  dayKey,
  subDayEntryId,
  substituteName,
  jobType,
  primaryAbsenceId,
  absenceOptions,
  coveringCount,
  freePeriodLabels,
}: {
  dayKey: string;
  subDayEntryId: string;
  substituteName: string;
  jobType: JobType;
  primaryAbsenceId: string | null;
  absenceOptions: { absenceId: string; teacherName: string }[];
  coveringCount: number;
  freePeriodLabels: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isRemoving, startRemoving] = useTransition();

  const absenceItems: Record<string, string> = {
    [UNASSIGNED]: "Not assigned yet",
    ...Object.fromEntries(absenceOptions.map((o) => [o.absenceId, o.teacherName])),
  };

  function save(data: { jobType?: JobType; primaryAbsenceId?: string | null }) {
    startTransition(async () => {
      const result = await updateSubDayEntry(dayKey, subDayEntryId, data);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex-1">
          <CardTitle>{substituteName}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {primaryAbsenceId
              ? `Covering ${coveringCount} ${coveringCount === 1 ? "class" : "classes"}`
              : "Not assigned to a teacher yet"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRemoving}
          onClick={() => {
            startRemoving(async () => {
              const result = await removeSubFromDay(dayKey, subDayEntryId);
              if (result.success) {
                toast.success(`${substituteName} removed from this day`);
              } else {
                toast.error(result.error ?? "Something went wrong");
              }
            });
          }}
        >
          {isRemoving ? "Removing..." : "Remove"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-1 flex-col gap-1 sm:w-[220px] sm:flex-none">
            <span className="text-muted-foreground text-xs">Covering for</span>
            <Select
              items={absenceItems}
              value={primaryAbsenceId ?? UNASSIGNED}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) return;
                save({ primaryAbsenceId: value === UNASSIGNED ? null : value });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Not assigned yet</SelectItem>
                {absenceOptions.map((option) => (
                  <SelectItem key={option.absenceId} value={option.absenceId}>
                    {option.teacherName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-1 flex-col gap-1 sm:w-[140px] sm:flex-none">
            <span className="text-muted-foreground text-xs">Available</span>
            <Select
              items={JOB_TYPE_LABELS}
              value={jobType}
              disabled={isPending}
              onValueChange={(value) => value && save({ jobType: value as JobType })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {primaryAbsenceId && (
          <div className="rounded-lg border border-dashed p-3">
            {freePeriodLabels.length > 0 ? (
              <>
                <p className="text-sm font-medium">
                  Free {freePeriodLabels.length}{" "}
                  {freePeriodLabels.length === 1 ? "period" : "periods"} — could cover
                  elsewhere
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {freePeriodLabels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Booked all day — no spare periods.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
