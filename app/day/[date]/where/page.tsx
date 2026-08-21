import { getOrCreateDefaultSchool } from "@/lib/school";
import { getSubLocations } from "@/lib/day-coverage";
import { resolveDayMoment } from "@/lib/coverage";
import { nowMinutesInTimeZone, todayDayKey } from "@/lib/day";
import { minutesToTime } from "@/lib/time";
import { SubBoard, type BoardSub } from "./sub-board";
import { LiveClock } from "./live-clock";

export const dynamic = "force-dynamic";

export default async function WherePage({ params }: PageProps<"/day/[date]/where"> ) {
  const { date: dayKey } = await params;
  const school = await getOrCreateDefaultSchool();
  const { periods, subs } = await getSubLocations(school.id, dayKey);

  // "Right now" only means something on the day you're living through. On any
  // other date this is a plain schedule rather than a live board.
  const isToday = dayKey === todayDayKey(school.timezone);
  const moment = isToday
    ? resolveDayMoment(periods, nowMinutesInTimeZone(school.timezone))
    : null;

  const focusPeriodSlotId =
    moment?.kind === "in-period"
      ? moment.periodSlotId
      : moment?.kind === "between-periods" || moment?.kind === "before-school"
        ? moment.nextPeriodSlotId
        : null;

  const focusIsUpcoming =
    moment?.kind === "between-periods" || moment?.kind === "before-school";

  const focusPeriod = periods.find((p) => p.periodSlotId === focusPeriodSlotId);

  const heading = !isToday
    ? "Where everyone is scheduled"
    : moment?.kind === "in-period"
      ? `Right now · ${focusPeriod?.label}`
      : moment?.kind === "between-periods"
        ? `Between periods · ${focusPeriod?.label} next`
        : moment?.kind === "before-school"
          ? `Before school · ${focusPeriod?.label} first`
          : moment?.kind === "after-school"
            ? "School day is over"
            : "No periods set up yet";

  const boardSubs: BoardSub[] = subs.map((sub) => ({
    subDayEntryId: sub.subDayEntryId,
    substituteName: sub.substituteName,
    subId: sub.subId,
    phone: sub.phone,
    isNoShow: sub.status === "NO_SHOW",
    slots: sub.slots.map((slot) => ({
      periodSlotId: slot.period.periodSlotId,
      periodLabel: slot.period.label,
      startMinutes: slot.period.startMinutes,
      endMinutes: slot.period.endMinutes,
      kind: slot.kind,
      teacherName: slot.teacherName,
      room: slot.room,
    })),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
        {focusPeriod && (
          <p className="text-muted-foreground">
            {minutesToTime(focusPeriod.startMinutes)}–
            {minutesToTime(focusPeriod.endMinutes)}
          </p>
        )}
      </div>

      <SubBoard
        subs={boardSubs}
        focusPeriodSlotId={focusPeriodSlotId}
        focusIsUpcoming={focusIsUpcoming}
        isLive={isToday}
      />

      {isToday && (
        <LiveClock checkedAt={minutesToTime(nowMinutesInTimeZone(school.timezone))} />
      )}
    </div>
  );
}
