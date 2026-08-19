const JOB_TYPE_MAP: Record<string, "AM" | "PM" | "FULL"> = {
  full: "FULL",
  "full day": "FULL",
  fullday: "FULL",
  all: "FULL",
  am: "AM",
  morning: "AM",
  "half am": "AM",
  pm: "PM",
  afternoon: "PM",
  "half pm": "PM",
};

export type RosterUploadRow = {
  subId?: string;
  substituteName: string;
  email?: string;
  phone?: string;
  teacherEmail: string;
  teacherName?: string;
  jobType: "AM" | "PM" | "FULL";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tolerant header lookup — exports from staffing systems rarely match a template exactly. */
function pick(raw: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    const hit = Object.keys(raw).find(
      (key) => key.trim().toLowerCase() === name.toLowerCase()
    );
    if (hit && raw[hit]?.trim()) return raw[hit].trim();
  }
  return undefined;
}

export function mapRosterRows(rawRows: Record<string, string>[]): {
  rows: RosterUploadRow[];
  errors: string[];
} {
  const rows: RosterUploadRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((raw, i) => {
    const rowNumber = i + 2; // +1 header, +1 for 1-indexing

    const substituteName = pick(raw, "Sub Name", "Substitute", "Substitute Name", "Name");
    const subId = pick(raw, "Sub ID", "SubID", "Employee ID", "ID");
    const email = pick(raw, "Sub Email", "Email", "Substitute Email");
    const phone = pick(raw, "Sub Phone", "Phone", "Substitute Phone");
    const teacherEmail = pick(raw, "Teacher Email", "Absent Teacher Email", "Teacher");
    const teacherName = pick(raw, "Teacher Name", "Absent Teacher");
    const jobTypeRaw = pick(raw, "Job Type", "Assignment", "Duration", "Type");

    if (!substituteName) {
      errors.push(`Row ${rowNumber}: missing substitute name`);
      return;
    }
    if (!subId && !email) {
      errors.push(
        `Row ${rowNumber}: "${substituteName}" needs a Sub ID or an email so they can be matched`
      );
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      errors.push(`Row ${rowNumber}: invalid email for "${substituteName}"`);
      return;
    }
    if (!teacherEmail || !EMAIL_RE.test(teacherEmail)) {
      errors.push(
        `Row ${rowNumber}: "${substituteName}" needs the email of the teacher they're covering`
      );
      return;
    }

    const jobType = jobTypeRaw ? JOB_TYPE_MAP[jobTypeRaw.toLowerCase()] : "FULL";
    if (!jobType) {
      errors.push(`Row ${rowNumber}: job type "${jobTypeRaw}" should be full, AM, or PM`);
      return;
    }

    rows.push({ subId, substituteName, email, phone, teacherEmail, teacherName, jobType });
  });

  return { rows, errors };
}

export const ROSTER_TEMPLATE_CSV = [
  "Sub ID,Sub Name,Sub Email,Sub Phone,Teacher Email,Job Type",
  "10482,Dana Whitfield,dana.whitfield@example.org,555-0142,jane.smith@example.edu,full",
  "10517,Marcus Bell,marcus.bell@example.org,555-0198,mark.lee@example.edu,AM",
].join("\n");
