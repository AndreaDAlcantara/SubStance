import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { TEACHER_SCHEDULE_TEMPLATE_HEADER } from "@/lib/validation/teacher-schedule-upload";

export async function GET() {
  const school = await getOrCreateDefaultSchool();
  const periods = await prisma.periodSlot.findMany({
    where: { schoolId: school.id },
    orderBy: { index: "asc" },
  });

  const lines = [TEACHER_SCHEDULE_TEMPLATE_HEADER];
  if (periods.length === 0) {
    lines.push("(set up your bell schedule first — this template needs its period numbers)");
  } else {
    periods.forEach((p, i) => {
      const type = p.label.toLowerCase().includes("lunch")
        ? "lunch"
        : i === 1
          ? "planning"
          : "class";
      const subject = type === "class" ? "Algebra I" : "";
      lines.push(`Jane Smith,jane.smith@example.edu,204,${p.index},${type},${subject}`);
    });
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="teacher-schedule-template.csv"',
    },
  });
}
