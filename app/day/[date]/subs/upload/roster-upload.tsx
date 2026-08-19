"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RosterUploadRow } from "@/lib/validation/roster-upload";
import { confirmRosterUpload } from "./actions";

type ParsedRow = RosterUploadRow & { teacherName?: string };
type ParseResponse = { rows: ParsedRow[]; errors: string[] } | { error: string };

const JOB_LABELS: Record<string, string> = {
  FULL: "Full day",
  AM: "Morning",
  PM: "Afternoon",
};

export function RosterUpload({ dayKey }: { dayKey: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);

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
      const res = await fetch(`/api/day/${dayKey}/roster/parse`, {
        method: "POST",
        body: formData,
      });
      const data: ParseResponse = await res.json();
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setErrors(data.errors);
      setRows(data.rows);
      if (data.rows.length === 0) {
        toast.error("No usable rows — check the problems listed below");
      } else {
        toast.success(`Read ${data.rows.length} assignment(s). Review before saving.`);
      }
    } catch {
      toast.error("Something went wrong reading that file");
    } finally {
      setIsParsing(false);
    }
  }

  function handleConfirm() {
    if (!rows || rows.length === 0) return;
    startSaving(async () => {
      const result = await confirmRosterUpload(
        dayKey,
        rows.map((r) => ({
          subId: r.subId,
          substituteName: r.substituteName,
          email: r.email,
          phone: r.phone,
          teacherEmail: r.teacherEmail,
          jobType: r.jobType,
        }))
      );

      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }

      const summary = result.summary!;
      toast.success(
        `${summary.staffed} substitute(s) loaded, ${summary.teachersMarkedOut} teacher(s) marked out`
      );
      if (summary.skipped.length > 0) {
        setErrors(summary.skipped);
        setRows(null);
      } else {
        router.push(`/day/${dayKey}/coverage`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm">
          Export the day&apos;s assignments from your staffing system and upload the file.
          Columns it looks for: <code>Sub ID</code>, <code>Sub Name</code>,{" "}
          <code>Sub Email</code>, <code>Sub Phone</code>, <code>Teacher Email</code>,{" "}
          <code>Job Type</code> (full/AM/PM).
        </p>
        <p className="text-muted-foreground text-sm">
          Substitutes are matched on Sub ID, so re-uploading a corrected file updates
          people instead of duplicating them. Teachers named here are marked out
          automatically.
        </p>
        <a href="/api/day/roster/template" className="text-primary w-fit text-sm underline">
          Download a template
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="text-sm" />
          <Button type="button" onClick={handleParse} disabled={isParsing} size="sm">
            {isParsing ? "Reading..." : "Read file"}
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            {errors.length} row(s) need attention:
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
            Check this looks right, then load it into the day.
          </p>
          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3"
              >
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-medium">{row.substituteName}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.subId ? `ID ${row.subId}` : row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm">covering</span>
                <span className="text-sm">{row.teacherName ?? row.teacherEmail}</span>
                <Badge variant="secondary">{JOB_LABELS[row.jobType]}</Badge>
              </div>
            ))}
          </div>
          <Button type="button" onClick={handleConfirm} disabled={isSaving} className="w-fit">
            {isSaving ? "Loading..." : `Load ${rows.length} assignment(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
