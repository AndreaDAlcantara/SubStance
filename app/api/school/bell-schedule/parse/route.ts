import { NextRequest, NextResponse } from "next/server";
import { parseSpreadsheetRows } from "@/lib/upload/parseSpreadsheet";
import { mapBellScheduleRows } from "@/lib/validation/bell-schedule-upload";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const rawRows = await parseSpreadsheetRows(file);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in that file" }, { status: 400 });
    }
    const { rows, errors } = mapBellScheduleRows(rawRows);
    return NextResponse.json({ rows, errors });
  } catch {
    return NextResponse.json(
      { error: "Could not read that file. Make sure it's a .csv or .xlsx." },
      { status: 400 }
    );
  }
}
