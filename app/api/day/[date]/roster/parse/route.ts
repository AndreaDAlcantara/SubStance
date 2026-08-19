import { NextRequest, NextResponse } from "next/server";
import { parseSpreadsheetRows } from "@/lib/upload/parseSpreadsheet";
import { mapRosterRows } from "@/lib/validation/roster-upload";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const school = await getOrCreateDefaultSchool();

  try {
    const rawRows = await parseSpreadsheetRows(file);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in that file" }, { status: 400 });
    }

    const { rows, errors } = mapRosterRows(rawRows);

    // Flag teachers we don't know about — the import can't guess their schedule,
    // and a coverage need without a schedule is meaningless.
    const teachers = await prisma.teacher.findMany({
      where: { schoolId: school.id, active: true },
      select: { email: true, name: true },
    });
    const knownEmails = new Map(teachers.map((t) => [t.email.toLowerCase(), t.name]));

    const resolved = rows.map((row) => ({
      ...row,
      teacherName: knownEmails.get(row.teacherEmail.toLowerCase()) ?? row.teacherName,
      teacherKnown: knownEmails.has(row.teacherEmail.toLowerCase()),
    }));

    const unknown = resolved.filter((r) => !r.teacherKnown);
    const allErrors = [
      ...errors,
      ...unknown.map(
        (r) =>
          `No teacher with email ${r.teacherEmail} — add them under Teachers first, then re-upload`
      ),
    ];

    return NextResponse.json({
      rows: resolved.filter((r) => r.teacherKnown),
      errors: allErrors,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read that file. Make sure it's a .csv or .xlsx." },
      { status: 400 }
    );
  }
}
