"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { markTeacherAbsent } from "./actions";

export function MarkAbsentPicker({
  dayKey,
  availableTeachers,
}: {
  dayKey: string;
  availableTeachers: { id: string; name: string }[];
}) {
  const [teacherId, setTeacherId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (availableTeachers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Every teacher is already marked out for this day.
      </p>
    );
  }

  function handleAdd() {
    if (!teacherId) {
      toast.error("Pick a teacher first");
      return;
    }
    startTransition(async () => {
      const result = await markTeacherAbsent(dayKey, teacherId);
      if (result.success) {
        const name = availableTeachers.find((t) => t.id === teacherId)?.name;
        toast.success(`${name} marked out`);
        setTeacherId("");
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={Object.fromEntries(availableTeachers.map((t) => [t.id, t.name]))}
        value={teacherId}
        onValueChange={(v) => setTeacherId(v ?? "")}
      >
        <SelectTrigger className="min-w-[200px] flex-1 sm:flex-none">
          <SelectValue placeholder="Pick a teacher..." />
        </SelectTrigger>
        <SelectContent>
          {availableTeachers.map((teacher) => (
            <SelectItem key={teacher.id} value={teacher.id}>
              {teacher.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" onClick={handleAdd} disabled={isPending}>
        {isPending ? "Adding..." : "Mark out"}
      </Button>
    </div>
  );
}
