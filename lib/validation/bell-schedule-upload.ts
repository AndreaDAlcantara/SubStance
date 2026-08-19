import { periodRowSchema, type PeriodRow } from "./bell-schedule";

function normalizeTime(raw: string): string {
  const trimmed = raw.trim();
  const [h, m] = trimmed.split(":");
  if (!h || !m) return trimmed;
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function mapBellScheduleRows(rawRows: Record<string, string>[]): {
  rows: PeriodRow[];
  errors: string[];
} {
  const rows: PeriodRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((raw, i) => {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const label = raw["Period Label"]?.trim();
    const startTime = raw["Start Time (HH:MM)"] ? normalizeTime(raw["Start Time (HH:MM)"]) : "";
    const endTime = raw["End Time (HH:MM)"] ? normalizeTime(raw["End Time (HH:MM)"]) : "";

    const parsed = periodRowSchema.omit({ id: true }).safeParse({ label, startTime, endTime });
    if (!parsed.success) {
      errors.push(`Row ${rowNumber}: ${parsed.error.issues[0]?.message ?? "invalid row"}`);
      return;
    }
    rows.push(parsed.data);
  });

  return { rows, errors };
}

export const BELL_SCHEDULE_TEMPLATE_CSV = [
  "Period Index,Period Label,Start Time (HH:MM),End Time (HH:MM)",
  "1,Period 1,08:00,08:50",
  "2,Period 2,08:50,09:40",
  "3,Lunch,11:30,12:10",
  "4,Period 3,12:10,13:00",
].join("\n");
