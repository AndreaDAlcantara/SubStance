const TYPE_MAP: Record<string, "CLASS" | "PLANNING" | "LUNCH"> = {
  class: "CLASS",
  planning: "PLANNING",
  lunch: "LUNCH",
};

export type TeacherScheduleUploadRow = {
  teacherName: string;
  email: string;
  room?: string;
  periodId: string;
  periodLabel: string;
  type: "CLASS" | "PLANNING" | "LUNCH";
  subjectLabel?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapTeacherScheduleRows(
  rawRows: Record<string, string>[],
  periods: { id: string; index: number; label: string }[]
): { rows: TeacherScheduleUploadRow[]; errors: string[] } {
  const periodByIndex = new Map(periods.map((p) => [p.index, p]));
  const rows: TeacherScheduleUploadRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((raw, i) => {
    const rowNumber = i + 2;
    const teacherName = raw["Teacher Name"]?.trim();
    const email = raw["Email"]?.trim();
    const room = raw["Room"]?.trim();
    const periodIndexRaw = raw["Period Index"]?.trim();
    const typeRaw = raw["Type"]?.trim().toLowerCase();
    const subjectLabel = raw["Subject"]?.trim();

    if (!teacherName) {
      errors.push(`Row ${rowNumber}: missing teacher name`);
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push(`Row ${rowNumber}: invalid email for "${teacherName}"`);
      return;
    }
    const periodIndex = Number(periodIndexRaw);
    if (!periodIndexRaw || Number.isNaN(periodIndex)) {
      errors.push(`Row ${rowNumber}: invalid period index`);
      return;
    }
    const period = periodByIndex.get(periodIndex);
    if (!period) {
      errors.push(`Row ${rowNumber}: no period with index ${periodIndex} in the bell schedule`);
      return;
    }
    const type = TYPE_MAP[typeRaw ?? ""];
    if (!type) {
      errors.push(`Row ${rowNumber}: type must be class, planning, or lunch`);
      return;
    }

    rows.push({
      teacherName,
      email,
      room: room || undefined,
      periodId: period.id,
      periodLabel: period.label,
      type,
      subjectLabel: type === "CLASS" ? subjectLabel || undefined : undefined,
    });
  });

  return { rows, errors };
}

export const TEACHER_SCHEDULE_TEMPLATE_HEADER =
  "Teacher Name,Email,Room,Period Index,Type,Subject";
