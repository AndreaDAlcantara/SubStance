import { NextResponse } from "next/server";
import { ROSTER_TEMPLATE_CSV } from "@/lib/validation/roster-upload";

export async function GET() {
  return new NextResponse(ROSTER_TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="daily-roster-template.csv"',
    },
  });
}
