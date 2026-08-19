"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { minutesToTime } from "@/lib/time";
import {
  teacherScheduleFormSchema,
  type TeacherScheduleForm,
} from "@/lib/validation/teacher-schedule";
import { saveTeacherSchedule } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  CLASS: "Class",
  PLANNING: "Planning",
  LUNCH: "Lunch",
};

type PeriodInfo = {
  id: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
};

type ExistingAssignment = {
  periodId: string;
  type: "CLASS" | "PLANNING" | "LUNCH";
  subjectLabel: string | null;
};

export function TeacherScheduleForm({
  teacherId,
  periods,
  existing,
}: {
  teacherId: string;
  periods: PeriodInfo[];
  existing: ExistingAssignment[];
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const existingByPeriod = new Map(existing.map((e) => [e.periodId, e]));

  const form = useForm<TeacherScheduleForm>({
    resolver: zodResolver(teacherScheduleFormSchema),
    defaultValues: {
      assignments: periods.map((p) => {
        const found = existingByPeriod.get(p.id);
        return {
          periodId: p.id,
          type: found?.type ?? "CLASS",
          subjectLabel: found?.subjectLabel ?? "",
        };
      }),
    },
  });

  const assignments = form.watch("assignments");

  function onSubmit(values: TeacherScheduleForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveTeacherSchedule(teacherId, values);
      if (result.success) {
        toast.success("Schedule saved");
      } else {
        setServerError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {periods.map((period, index) => {
          const currentType = assignments[index]?.type;
          return (
            <div
              key={period.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{period.label}</p>
                <p className="text-muted-foreground text-xs">
                  {minutesToTime(period.startMinutes)} – {minutesToTime(period.endMinutes)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex w-full flex-col gap-1 sm:w-[150px]">
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <Select
                    value={currentType}
                    onValueChange={(v) =>
                      v &&
                      form.setValue(`assignments.${index}.type`, v as "CLASS" | "PLANNING" | "LUNCH", {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentType === "CLASS" && (
                  <div className="flex flex-1 flex-col gap-1 sm:w-[180px] sm:flex-none">
                    <Label className="text-muted-foreground text-xs">Subject (optional)</Label>
                    <Input
                      {...form.register(`assignments.${index}.subjectLabel`)}
                      placeholder="Algebra I"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save schedule"}
      </Button>
    </form>
  );
}
