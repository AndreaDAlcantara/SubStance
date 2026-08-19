-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('CLASS', 'PLANNING', 'LUNCH');

-- CreateEnum
CREATE TYPE "AbsenceScope" AS ENUM ('FULL_DAY', 'PARTIAL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('AM', 'PM', 'FULL');

-- CreateEnum
CREATE TYPE "CoverageSource" AS ENUM ('PRIMARY', 'SLACK');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "middayCutoffMinutes" INTEGER NOT NULL DEFAULT 720,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "room" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPeriodAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "type" "PeriodType" NOT NULL,
    "room" TEXT,
    "subjectLabel" TEXT,

    CONSTRAINT "TeacherPeriodAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substitute" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Substitute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "scope" "AbsenceScope" NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsencePeriod" (
    "id" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,

    CONSTRAINT "AbsencePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubDayEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "jobType" "JobType" NOT NULL,
    "primaryAbsenceId" TEXT,

    CONSTRAINT "SubDayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageAssignment" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "periodId" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "subDayEntryId" TEXT NOT NULL,
    "source" "CoverageSource" NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "subDayEntryId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Period_schoolId_index_key" ON "Period"("schoolId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPeriodAssignment_teacherId_periodId_key" ON "TeacherPeriodAssignment"("teacherId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "Absence_teacherId_date_key" ON "Absence"("teacherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AbsencePeriod_absenceId_periodId_key" ON "AbsencePeriod"("absenceId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "SubDayEntry_substituteId_date_key" ON "SubDayEntry"("substituteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CoverageAssignment_absenceId_periodId_key" ON "CoverageAssignment"("absenceId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverageAssignment_subDayEntryId_periodId_key" ON "CoverageAssignment"("subDayEntryId", "periodId");

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPeriodAssignment" ADD CONSTRAINT "TeacherPeriodAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPeriodAssignment" ADD CONSTRAINT "TeacherPeriodAssignment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitute" ADD CONSTRAINT "Substitute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsencePeriod" ADD CONSTRAINT "AbsencePeriod_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsencePeriod" ADD CONSTRAINT "AbsencePeriod_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDayEntry" ADD CONSTRAINT "SubDayEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDayEntry" ADD CONSTRAINT "SubDayEntry_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "Substitute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDayEntry" ADD CONSTRAINT "SubDayEntry_primaryAbsenceId_fkey" FOREIGN KEY ("primaryAbsenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageAssignment" ADD CONSTRAINT "CoverageAssignment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageAssignment" ADD CONSTRAINT "CoverageAssignment_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageAssignment" ADD CONSTRAINT "CoverageAssignment_subDayEntryId_fkey" FOREIGN KEY ("subDayEntryId") REFERENCES "SubDayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_subDayEntryId_fkey" FOREIGN KEY ("subDayEntryId") REFERENCES "SubDayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
