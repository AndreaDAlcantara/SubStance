import { NextResponse } from "next/server";
import { BELL_SCHEDULE_TEMPLATE_CSV } from "@/lib/validation/bell-schedule-upload";

export async function GET() {
  return new NextResponse(BELL_SCHEDULE_TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="bell-schedule-template.csv"',
    },
  });
}
