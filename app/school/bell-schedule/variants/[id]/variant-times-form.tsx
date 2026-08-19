"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minutesToTime } from "@/lib/time";
import {
  bellScheduleVariantFormSchema,
  type BellScheduleVariantForm,
} from "@/lib/validation/bell-schedule-variant";
import { saveBellScheduleVariant, deleteBellScheduleVariant } from "./actions";

type PeriodRow = {
  periodSlotId: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
};

export function VariantTimesForm({
  bellScheduleId,
  periods,
}: {
  bellScheduleId: string;
  periods: PeriodRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BellScheduleVariantForm>({
    resolver: zodResolver(bellScheduleVariantFormSchema),
    defaultValues: {
      times: periods.map((p) => ({
        periodSlotId: p.periodSlotId,
        startTime: minutesToTime(p.startMinutes),
        endTime: minutesToTime(p.endMinutes),
      })),
    },
  });

  function onSubmit(values: BellScheduleVariantForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveBellScheduleVariant(bellScheduleId, values);
      if (result.success) {
        toast.success("Schedule saved");
      } else {
        setServerError(result.error ?? "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this schedule? This can't be undone.")) return;
    startDeleting(async () => {
      const result = await deleteBellScheduleVariant(bellScheduleId);
      if (result.success) {
        toast.success("Schedule deleted");
        router.push("/school/bell-schedule");
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {periods.map((period, index) => (
          <div
            key={period.periodSlotId}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end"
          >
            <p className="flex-1 text-sm font-medium">{period.label}</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-1 flex-col gap-1 sm:w-[130px] sm:flex-none">
                <Label className="text-muted-foreground text-xs">Start</Label>
                <Input type="time" {...form.register(`times.${index}.startTime`)} />
              </div>
              <div className="flex flex-1 flex-col gap-1 sm:w-[130px] sm:flex-none">
                <Label className="text-muted-foreground text-xs">End</Label>
                <Input type="time" {...form.register(`times.${index}.endTime`)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save times"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete schedule"}
        </Button>
      </div>
    </form>
  );
}
