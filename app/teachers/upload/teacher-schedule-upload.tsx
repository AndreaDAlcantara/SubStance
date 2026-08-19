"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { TeacherScheduleUploadRow } from "@/lib/validation/teacher-schedule-upload";
import { confirmTeacherScheduleUpload } from "./actions";

type ParseResponse = { rows: TeacherScheduleUploadRow[]; errors: string[] } | { error: string };

const TYPE_LABELS: Record<string, string> = {
  CLASS: "Class",
  PLANNING: "Planning",
  LUNCH: "Lunch",
};

export function TeacherScheduleUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<TeacherScheduleUploadRow[] | null>(null);

  async function handleParse() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setIsParsing(true);
    setErrors([]);
    setRows(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/teachers/parse", { method: "POST", body: formData });
      const data: ParseResponse = await res.json();
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setErrors(data.errors);
      setRows(data.rows);
      if (data.rows.length === 0) {
        toast.error("No valid rows found — check the errors below");
      } else {
        toast.success(`Parsed ${data.rows.length} row(s). Review below before saving.`);
      }
    } catch {
      toast.error("Something went wrong reading that file");
    } finally {
      setIsParsing(false);
    }
  }

  function updateRow(index: number, patch: Partial<TeacherScheduleUploadRow>) {
    setRows((prev) => (prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev));
  }

  function removeRow(index: number) {
    setRows((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleConfirm() {
    if (!rows || rows.length === 0) return;
    startSaving(async () => {
      const result = await confirmTeacherScheduleUpload(
        rows.map((r) => ({
          teacherName: r.teacherName,
          email: r.email,
          room: r.room,
          periodId: r.periodId,
          type: r.type,
          subjectLabel: r.subjectLabel,
        }))
      );
      if (result.success) {
        toast.success("Teacher schedules saved");
        setRows(null);
        setErrors([]);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm">
          Upload a CSV or Excel file with columns: <code>Teacher Name</code>, <code>Email</code>,{" "}
          <code>Room</code>, <code>Period Index</code>, <code>Type</code> (class/planning/lunch),{" "}
          <code>Subject</code>. One row per teacher per period.
        </p>
        <a href="/api/teachers/template" className="text-primary w-fit text-sm underline">
          Download a template
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="text-sm" />
          <Button type="button" onClick={handleParse} disabled={isParsing} size="sm">
            {isParsing ? "Reading..." : "Parse file"}
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            {errors.length} row(s) couldn&apos;t be read:
          </p>
          <ul className="mt-1 list-inside list-disc text-destructive">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Review and fix anything below, then save.
          </p>
          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{row.teacherName}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.email}
                    {row.room ? ` · Room ${row.room}` : ""} · {row.periodLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex w-full flex-col gap-1 sm:w-[140px]">
                    <Select
                      items={TYPE_LABELS}
                      value={row.type}
                      onValueChange={(v) => v && updateRow(index, { type: v as typeof row.type })}
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
                  {row.type === "CLASS" && (
                    <Input
                      value={row.subjectLabel ?? ""}
                      onChange={(e) => updateRow(index, { subjectLabel: e.target.value })}
                      placeholder="Subject"
                      className="sm:w-[160px]"
                    />
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" onClick={handleConfirm} disabled={isSaving} className="w-fit">
            {isSaving ? "Saving..." : `Save ${rows.length} row(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
