"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobType } from "@/lib/generated/prisma/enums";
import { addSubToDay } from "./actions";
import { JOB_TYPE_LABELS } from "./labels";

export function AddSubPicker({
  dayKey,
  availableSubstitutes,
}: {
  dayKey: string;
  availableSubstitutes: { id: string; name: string }[];
}) {
  const [substituteId, setSubstituteId] = useState<string>("");
  const [jobType, setJobType] = useState<JobType>("FULL");
  const [isPending, startTransition] = useTransition();

  if (availableSubstitutes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Everyone in your{" "}
        <Link href="/substitutes" className="underline">
          substitute list
        </Link>{" "}
        is already scheduled for this day.
      </p>
    );
  }

  function handleAdd() {
    if (!substituteId) {
      toast.error("Pick a substitute first");
      return;
    }
    startTransition(async () => {
      const result = await addSubToDay(dayKey, substituteId, jobType);
      if (result.success) {
        const name = availableSubstitutes.find((s) => s.id === substituteId)?.name;
        toast.success(`${name} added for this day`);
        setSubstituteId("");
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={Object.fromEntries(availableSubstitutes.map((s) => [s.id, s.name]))}
        value={substituteId}
        onValueChange={(v) => setSubstituteId(v ?? "")}
      >
        <SelectTrigger className="min-w-[200px] flex-1 sm:flex-none">
          <SelectValue placeholder="Pick a substitute..." />
        </SelectTrigger>
        <SelectContent>
          {availableSubstitutes.map((substitute) => (
            <SelectItem key={substitute.id} value={substitute.id}>
              {substitute.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={JOB_TYPE_LABELS}
        value={jobType}
        onValueChange={(v) => v && setJobType(v as JobType)}
      >
        <SelectTrigger className="min-w-[130px]">
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

      <Button type="button" onClick={handleAdd} disabled={isPending}>
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}
