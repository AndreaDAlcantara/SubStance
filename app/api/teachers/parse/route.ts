import { NextRequest, NextResponse } from "next/server";
import { parseSpreadsheetRows } from "@/lib/upload/parseSpreadsheet";
import { mapTeacherScheduleRows } from "@/lib/validation/teacher-schedule-upload";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const school = await getOrCreateDefaultSchool();
  const periods = await prisma.periodSlot.findMany({
    where: { schoolId: school.id },
    orderBy: { index: "asc" },
  });

  if (periods.length === 0) {
    return NextResponse.json(
      { error: "Set up the bell schedule before uploading teacher schedules." },
      { status: 400 }
    );
  }

  try {
    const rawRows = await parseSpreadsheetRows(file);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in that file" }, { status: 400 });
    }
    const { rows, errors } = mapTeacherScheduleRows(rawRows, periods);
    return NextResponse.json({ rows, errors });
  } catch {
    return NextResponse.json(
      { error: "Could not read that file. Make sure it's a .csv or .xlsx." },
      { status: 400 }
    );
  }
}
