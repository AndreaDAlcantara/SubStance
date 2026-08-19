"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { timeToMinutes } from "@/lib/time";
import type { PeriodRow } from "@/lib/validation/bell-schedule";
import { BellScheduleForm } from "../bell-schedule-form";

type ParseResponse = { rows: PeriodRow[]; errors: string[] } | { error: string };

export function BellScheduleUpload({
  schoolName,
  timezone,
}: {
  schoolName: string;
  timezone: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<PeriodRow[] | null>(null);

  async function handleParse() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setIsParsing(true);
    setErrors([]);
    setParsedRows(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/school/bell-schedule/parse", {
        method: "POST",
        body: formData,
      });
      const data: ParseResponse = await res.json();
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setErrors(data.errors);
      setParsedRows(data.rows);
      if (data.rows.length === 0) {
        toast.error("No valid rows found — check the errors below");
      } else {
        toast.success(`Parsed ${data.rows.length} period(s). Review below before saving.`);
      }
    } catch {
      toast.error("Something went wrong reading that file");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm">
          Upload a CSV or Excel file with columns: <code>Period Index</code>,{" "}
          <code>Period Label</code>, <code>Start Time (HH:MM)</code>,{" "}
          <code>End Time (HH:MM)</code>.
        </p>
        <a
          href="/api/school/bell-schedule/template"
          className="text-primary w-fit text-sm underline"
        >
          Download a template
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="text-sm"
          />
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

      {parsedRows && parsedRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Review and fix anything below, then save.
          </p>
          <BellScheduleForm
            schoolName={schoolName}
            timezone={timezone}
            periods={parsedRows.map((r) => ({
              label: r.label,
              startMinutes: timeToMinutes(r.startTime),
              endMinutes: timeToMinutes(r.endTime),
            }))}
          />
        </div>
      )}
    </div>
  );
}
