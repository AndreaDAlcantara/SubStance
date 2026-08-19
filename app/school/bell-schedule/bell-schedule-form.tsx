"use client";

import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import {
  bellScheduleFormSchema,
  type BellScheduleForm,
} from "@/lib/validation/bell-schedule";
import { minutesToTime, US_TIMEZONES } from "@/lib/time";
import { saveBellSchedule } from "./actions";

type InitialPeriod = {
  id?: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
};

function nextDefaultPeriod(periods: { endTime: string }[]) {
  const lastEnd = periods.length > 0 ? periods[periods.length - 1].endTime : "08:00";
  const [h, m] = lastEnd.split(":").map(Number);
  const startTotal = h * 60 + m;
  const endTotal = startTotal + 50;
  const toHHMM = (total: number) =>
    `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60)
      .toString()
      .padStart(2, "0")}`;
  return { startTime: toHHMM(startTotal), endTime: toHHMM(endTotal) };
}

export function BellScheduleForm({
  schoolName,
  timezone,
  periods,
}: {
  schoolName: string;
  timezone: string;
  periods: InitialPeriod[];
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BellScheduleForm>({
    resolver: zodResolver(bellScheduleFormSchema),
    defaultValues: {
      schoolName,
      timezone,
      periods: periods.map((p) => ({
        id: p.id,
        label: p.label,
        startTime: minutesToTime(p.startMinutes),
        endTime: minutesToTime(p.endMinutes),
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "periods",
  });

  function onSubmit(values: BellScheduleForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveBellSchedule(values);
      if (result.success) {
        toast.success("Bell schedule saved");
      } else {
        setServerError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="schoolName">School name</Label>
          <Input id="schoolName" {...form.register("schoolName")} />
          {form.formState.errors.schoolName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.schoolName.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            items={Object.fromEntries(US_TIMEZONES.map((tz) => [tz.value, tz.label]))}
            value={form.watch("timezone")}
            onValueChange={(v) => v && form.setValue("timezone", v, { shouldDirty: true })}
          >
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {US_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Periods</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const current = form.getValues("periods");
              const defaults = nextDefaultPeriod(current);
              append({
                label: `Period ${current.length + 1}`,
                startTime: defaults.startTime,
                endTime: defaults.endTime,
              });
            }}
          >
            Add period
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor={`period-label-${index}`} className="text-muted-foreground text-xs">
                  Label
                </Label>
                <Input
                  id={`period-label-${index}`}
                  {...form.register(`periods.${index}.label`)}
                  placeholder="Period 1, Lunch..."
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-1 flex-col gap-1 sm:w-[130px] sm:flex-none">
                  <Label htmlFor={`period-start-${index}`} className="text-muted-foreground text-xs">
                    Start
                  </Label>
                  <Input
                    id={`period-start-${index}`}
                    type="time"
                    {...form.register(`periods.${index}.startTime`)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 sm:w-[130px] sm:flex-none">
                  <Label htmlFor={`period-end-${index}`} className="text-muted-foreground text-xs">
                    End
                  </Label>
                  <Input
                    id={`period-end-${index}`}
                    type="time"
                    {...form.register(`periods.${index}.endTime`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  aria-label="Remove period"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No periods yet — click &quot;Add period&quot; to start.
            </p>
          )}
        </div>
        {form.formState.errors.periods?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.periods.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save bell schedule"}
      </Button>
    </form>
  );
}
