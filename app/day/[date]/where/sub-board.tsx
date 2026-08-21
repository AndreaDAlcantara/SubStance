"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhoneLink } from "@/components/phone-link";
import { minutesToTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export type BoardSlot = {
  periodSlotId: string;
  periodLabel: string;
  startMinutes: number;
  endMinutes: number;
  kind: "covering" | "free" | "off";
  teacherName?: string;
  room?: string | null;
};

export type BoardSub = {
  subDayEntryId: string;
  substituteName: string;
  subId: string | null;
  phone: string | null;
  isNoShow: boolean;
  slots: BoardSlot[];
};

/** On a day that isn't today there's no "now" to report, so summarise instead. */
function summarize(slots: BoardSlot[]): string {
  const covering = slots.filter((s) => s.kind === "covering").length;
  const free = slots.filter((s) => s.kind === "free").length;
  if (covering === 0 && free === 0) return "Not in the building";
  if (covering === 0) return "Here, but not assigned to any classes";
  const parts = [`Covering ${covering} ${covering === 1 ? "period" : "periods"}`];
  if (free > 0) parts.push(`${free} free`);
  return parts.join(" · ");
}

export function SubBoard({
  subs,
  focusPeriodSlotId,
  focusIsUpcoming,
  isLive,
}: {
  subs: BoardSub[];
  /** The period being shown — in progress, or the one about to start. */
  focusPeriodSlotId: string | null;
  focusIsUpcoming: boolean;
  /** False on any date other than today, where "right now" means nothing. */
  isLive: boolean;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return subs;

    // Whoever is asking might name the sub, the teacher, or just the room.
    return subs.filter((sub) => {
      if (sub.substituteName.toLowerCase().includes(needle)) return true;
      if (sub.subId?.toLowerCase().includes(needle)) return true;
      return sub.slots.some(
        (slot) =>
          slot.teacherName?.toLowerCase().includes(needle) ||
          slot.room?.toLowerCase().includes(needle)
      );
    });
  }, [subs, query]);

  if (subs.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-4">
        Nobody is subbing on this day yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a sub, teacher, or room..."
        className="h-11 text-base"
      />

      {visible.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nobody matches &quot;{query}&quot;.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((sub) => {
          const focus = focusPeriodSlotId
            ? sub.slots.find((s) => s.periodSlotId === focusPeriodSlotId)
            : undefined;

          return (
            <div key={sub.subDayEntryId} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight">
                    {sub.substituteName}
                  </h3>
                  {sub.subId && (
                    <Badge variant="outline" className="font-normal">
                      ID {sub.subId}
                    </Badge>
                  )}
                </div>
                <PhoneLink phone={sub.phone} className="text-base" />
              </div>

              <p
                className={cn(
                  "mt-1 text-lg",
                  sub.isNoShow && "text-destructive font-medium"
                )}
              >
                {sub.isNoShow ? (
                  "Didn't show up"
                ) : !isLive ? (
                  <span className="text-muted-foreground">
                    {summarize(sub.slots)}
                  </span>
                ) : !focus ? (
                  <span className="text-muted-foreground">Not in the building</span>
                ) : focus.kind === "covering" ? (
                  <>
                    <span className="font-semibold">
                      {focus.room ? `Room ${focus.room}` : focus.teacherName}
                    </span>
                    {focus.room && (
                      <span className="text-muted-foreground"> · {focus.teacherName}</span>
                    )}
                    {focusIsUpcoming && (
                      <span className="text-muted-foreground"> (next)</span>
                    )}
                  </>
                ) : focus.kind === "free" ? (
                  <span className="text-muted-foreground">
                    Free{focusIsUpcoming ? " next period" : " right now"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not in the building</span>
                )}
              </p>

              <details className="mt-3">
                <summary className="text-muted-foreground cursor-pointer text-sm select-none">
                  Their whole day
                </summary>
                <div className="mt-2 flex flex-col gap-1">
                  {sub.slots.map((slot) => (
                    <div
                      key={slot.periodSlotId}
                      className={cn(
                        "flex flex-wrap items-baseline gap-x-2 rounded-md px-2 py-1 text-sm",
                        slot.periodSlotId === focusPeriodSlotId && "bg-muted font-medium"
                      )}
                    >
                      <span className="min-w-[110px]">{slot.periodLabel}</span>
                      <span className="text-muted-foreground text-xs">
                        {minutesToTime(slot.startMinutes)}–{minutesToTime(slot.endMinutes)}
                      </span>
                      <span className="ml-auto">
                        {slot.kind === "covering" ? (
                          <>
                            {slot.room ? `Room ${slot.room}` : ""}
                            {slot.room && slot.teacherName ? " · " : ""}
                            {slot.teacherName}
                          </>
                        ) : slot.kind === "free" ? (
                          <span className="text-muted-foreground">Free</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
