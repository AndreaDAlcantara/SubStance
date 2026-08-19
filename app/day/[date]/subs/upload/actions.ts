"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { afterDayChange } from "@/lib/day-coverage";
import { dayKeyToDate, isValidDayKey } from "@/lib/day";
import type { JobType } from "@/lib/generated/prisma/enums";

export type ConfirmRosterRow = {
  subId?: string;
  substituteName: string;
  email?: string;
  phone?: string;
  teacherEmail: string;
  jobType: JobType;
};

export type ConfirmResult = {
  success: boolean;
  error?: string;
  summary?: { staffed: number; teachersMarkedOut: number; skipped: string[] };
};

/**
 * Loads a day's already-scheduled coverage in one go: the substitute, the teacher
 * they're covering being out, and the pairing between them.
 *
 * Matching a sub prefers Sub ID (the district's identifier) and falls back to email,
 * so re-importing a corrected file updates people instead of duplicating them.
 */
export async function confirmRosterUpload(
  dayKey: string,
  rows: ConfirmRosterRow[]
): Promise<ConfirmResult> {
  if (!isValidDayKey(dayKey)) return { success: false, error: "Invalid date" };
  if (rows.length === 0) return { success: false, error: "Nothing to import" };

  const school = await getOrCreateDefaultSchool();
  const date = dayKeyToDate(dayKey);

  const teachers = await prisma.teacher.findMany({
    where: { schoolId: school.id, active: true },
  });
  const teacherByEmail = new Map(teachers.map((t) => [t.email.toLowerCase(), t]));

  const skipped: string[] = [];
  let staffed = 0;
  let teachersMarkedOut = 0;

  for (const row of rows) {
    const teacher = teacherByEmail.get(row.teacherEmail.toLowerCase());
    if (!teacher) {
      skipped.push(`${row.substituteName}: no teacher with email ${row.teacherEmail}`);
      continue;
    }

    const substitute = await upsertSubstitute(school.id, row);

    // The file saying "this sub covers this teacher" implies the teacher is out.
    let absence = await prisma.absence.findUnique({
      where: { teacherId_date: { teacherId: teacher.id, date } },
    });
    if (!absence) {
      absence = await prisma.absence.create({
        data: { schoolId: school.id, teacherId: teacher.id, date, scope: "FULL_DAY" },
      });
      teachersMarkedOut += 1;
    }

    const otherSubOnTeacher = await prisma.subDayEntry.findFirst({
      where: { date, primaryAbsenceId: absence.id, substituteId: { not: substitute.id } },
      include: { substitute: true },
    });
    if (otherSubOnTeacher) {
      skipped.push(
        `${row.substituteName}: ${otherSubOnTeacher.substitute.name} is already covering ${teacher.name}`
      );
      continue;
    }

    // A sub can only be in one classroom, so a second row for the same person is a
    // conflict in the source file rather than something to resolve by guessing.
    const subAlreadyPlaced = await prisma.subDayEntry.findUnique({
      where: { substituteId_date: { substituteId: substitute.id, date } },
      include: { primaryAbsence: { include: { teacher: true } } },
    });
    if (
      subAlreadyPlaced?.primaryAbsenceId &&
      subAlreadyPlaced.primaryAbsenceId !== absence.id
    ) {
      skipped.push(
        `${row.substituteName}: already down for ${
          subAlreadyPlaced.primaryAbsence?.teacher.name ?? "another teacher"
        } this day`
      );
      continue;
    }

    await prisma.subDayEntry.upsert({
      where: { substituteId_date: { substituteId: substitute.id, date } },
      create: {
        schoolId: school.id,
        substituteId: substitute.id,
        date,
        jobType: row.jobType,
        primaryAbsenceId: absence.id,
      },
      update: { jobType: row.jobType, primaryAbsenceId: absence.id },
    });
    staffed += 1;
  }

  await afterDayChange(school.id, dayKey);
  return { success: true, summary: { staffed, teachersMarkedOut, skipped } };
}

async function upsertSubstitute(schoolId: string, row: ConfirmRosterRow) {
  const existing = row.subId
    ? await prisma.substitute.findFirst({ where: { schoolId, subId: row.subId } })
    : row.email
      ? await prisma.substitute.findFirst({ where: { schoolId, email: row.email } })
      : null;

  if (existing) {
    return prisma.substitute.update({
      where: { id: existing.id },
      data: {
        name: row.substituteName,
        active: true,
        ...(row.subId ? { subId: row.subId } : {}),
        ...(row.email ? { email: row.email } : {}),
        ...(row.phone ? { phone: row.phone } : {}),
      },
    });
  }

  return prisma.substitute.create({
    data: {
      schoolId,
      subId: row.subId ?? null,
      name: row.substituteName,
      email: row.email ?? "",
      phone: row.phone ?? null,
    },
  });
}
