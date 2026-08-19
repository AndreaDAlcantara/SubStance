"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setDayBellSchedule } from "./actions";

export function DaySchedulePicker({
  dayKey,
  bellSchedules,
  activeBellScheduleId,
}: {
  dayKey: string;
  bellSchedules: { id: string; name: string; isDefault: boolean }[];
  activeBellScheduleId: string;
}) {
  const [isPending, startTransition] = useTransition();

  // With only a default schedule there's nothing to choose between.
  if (bellSchedules.length < 2) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Bell schedule:</span>
      <Select
        items={Object.fromEntries(bellSchedules.map((s) => [s.id, s.name]))}
        value={activeBellScheduleId}
        disabled={isPending}
        onValueChange={(value) => {
          if (!value || value === activeBellScheduleId) return;
          startTransition(async () => {
            const result = await setDayBellSchedule(dayKey, value);
            if (result.success) {
              const name = bellSchedules.find((s) => s.id === value)?.name;
              toast.success(`Using ${name} for this day`);
            } else {
              toast.error(result.error ?? "Something went wrong");
            }
          });
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {bellSchedules.map((schedule) => (
            <SelectItem key={schedule.id} value={schedule.id}>
              {schedule.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
