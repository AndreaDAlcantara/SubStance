"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneLink } from "@/components/phone-link";
import { minutesToTime } from "@/lib/time";
import { unassignCoverage } from "./actions";

export function CoveredRow({
  dayKey,
  assignmentId,
  periodLabel,
  startMinutes,
  endMinutes,
  teacherName,
  room,
  substituteName,
  phone,
  isReassignment,
}: {
  dayKey: string;
  /** Null for planned coverage — that comes from the schedule, not from a decision here. */
  assignmentId: string | null;
  periodLabel: string;
  startMinutes: number;
  endMinutes: number;
  teacherName: string;
  room: string | null;
  substituteName: string;
  phone: string | null;
  isReassignment: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3">
      <div className="min-w-[140px] flex-1">
        <p className="text-sm font-medium">
          {periodLabel}{" "}
          <span className="text-muted-foreground font-normal">
            {minutesToTime(startMinutes)}–{minutesToTime(endMinutes)}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {teacherName}
          {room ? ` · Room ${room}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">{substituteName}</span>
        {isReassignment && <Badge variant="outline">Reassigned</Badge>}
        <PhoneLink phone={phone} className="text-muted-foreground" />
      </div>

      {assignmentId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await unassignCoverage(dayKey, assignmentId);
              if (result.success) {
                toast.success(`${periodLabel} is open again`);
              } else {
                toast.error(result.error ?? "Something went wrong");
              }
            });
          }}
        >
          {isPending ? "Removing..." : "Undo"}
        </Button>
      )}
    </div>
  );
}
