"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { SubDayStatus } from "@/lib/generated/prisma/enums";
import { teacherLeaving, subNoShow, subLeftEarly } from "./emergency-actions-server";

type PeriodOption = { periodSlotId: string; label: string; index: number };
type SubOption = {
  subDayEntryId: string;
  name: string;
  status: SubDayStatus;
  lastPeriodId: string | null;
};
type TeacherOption = { teacherId: string; name: string; alreadyOut: boolean };

type Kind = "teacher-home" | "teacher-meeting" | "sub-noshow" | "sub-left";

const COPY: Record<Kind, { title: string; description: string; cta: string }> = {
  "teacher-home": {
    title: "A teacher went home",
    description: "Their remaining classes need someone, starting from the period you pick.",
    cta: "Open their classes",
  },
  "teacher-meeting": {
    title: "A teacher has to step out",
    description: "Pick the periods they'll miss — the rest of their day is unaffected.",
    cta: "Open those periods",
  },
  "sub-noshow": {
    title: "A sub didn't show up",
    description: "Everything they were down to cover opens back up.",
    cta: "Mark as no-show",
  },
  "sub-left": {
    title: "A sub left early",
    description: "Anything after the last period they worked opens back up.",
    cta: "Mark as left early",
  },
};

export function EmergencyActions({
  dayKey,
  periods,
  subsOnDuty,
  teachers,
}: {
  dayKey: string;
  periods: PeriodOption[];
  subsOnDuty: SubOption[];
  teachers: TeacherOption[];
}) {
  const [kind, setKind] = useState<Kind | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">Something just changed?</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setKind("teacher-home")}>
          Teacher went home
        </Button>
        <Button variant="outline" size="sm" onClick={() => setKind("teacher-meeting")}>
          Teacher stepping out
        </Button>
        <Button variant="outline" size="sm" onClick={() => setKind("sub-noshow")}>
          Sub didn&apos;t show
        </Button>
        <Button variant="outline" size="sm" onClick={() => setKind("sub-left")}>
          Sub left early
        </Button>
      </div>

      {kind && (
        <EmergencyDialog
          kind={kind}
          dayKey={dayKey}
          periods={periods}
          subsOnDuty={subsOnDuty}
          teachers={teachers}
          onClose={() => setKind(null)}
        />
      )}
    </div>
  );
}

function EmergencyDialog({
  kind,
  dayKey,
  periods,
  subsOnDuty,
  teachers,
  onClose,
}: {
  kind: Kind;
  dayKey: string;
  periods: PeriodOption[];
  subsOnDuty: SubOption[];
  teachers: TeacherOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [personId, setPersonId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[kind];
  const isTeacherSide = kind === "teacher-home" || kind === "teacher-meeting";
  const needsPeriod = kind !== "sub-noshow";

  // A sub already marked no-show has nothing left to take away.
  const subChoices = subsOnDuty.filter((s) => s.status === "PRESENT");
  // A teacher already marked out doesn't need marking out again.
  const teacherChoices = teachers.filter((t) => !t.alreadyOut);

  const personLabel = isTeacherSide ? "Teacher" : "Substitute";
  const periodLabel =
    kind === "teacher-home"
      ? "First period they'll miss"
      : kind === "teacher-meeting"
        ? "Period they'll miss"
        : "Last period they worked";

  function submit() {
    setError(null);
    if (!personId) {
      setError(`Pick a ${personLabel.toLowerCase()} first`);
      return;
    }
    if (needsPeriod && !periodId) {
      setError("Pick a period first");
      return;
    }

    startTransition(async () => {
      const result =
        kind === "sub-noshow"
          ? await subNoShow(dayKey, personId)
          : kind === "sub-left"
            ? await subLeftEarly(dayKey, personId, periodId)
            : await teacherLeaving(dayKey, personId, periodId, kind === "teacher-home");

      if (result.success) {
        toast.success(result.message ?? "Updated");
        onClose();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <div className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label>{personLabel}</Label>
            {isTeacherSide ? (
              teacherChoices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Every teacher is already marked out for this day.
                </p>
              ) : (
                <Select
                  items={Object.fromEntries(
                    teacherChoices.map((t) => [t.teacherId, t.name])
                  )}
                  value={personId}
                  onValueChange={(v) => setPersonId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherChoices.map((t) => (
                      <SelectItem key={t.teacherId} value={t.teacherId}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : subChoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No substitutes on today&apos;s list yet.
              </p>
            ) : (
              <Select
                items={Object.fromEntries(
                  subChoices.map((s) => [s.subDayEntryId, s.name])
                )}
                value={personId}
                onValueChange={(v) => setPersonId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a substitute..." />
                </SelectTrigger>
                <SelectContent>
                  {subChoices.map((s) => (
                    <SelectItem key={s.subDayEntryId} value={s.subDayEntryId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {needsPeriod && (
            <div className="flex flex-col gap-2">
              <Label>{periodLabel}</Label>
              <Select
                items={Object.fromEntries(periods.map((p) => [p.periodSlotId, p.label]))}
                value={periodId}
                onValueChange={(v) => setPeriodId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a period..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.periodSlotId} value={p.periodSlotId}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? "Working..." : copy.cta}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
