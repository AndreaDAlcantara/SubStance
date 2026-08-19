-- Rename Period -> PeriodSlot (preserves data + all FKs pointing at it, since Postgres
-- tracks foreign keys by OID, not by name).
ALTER TABLE "Period" RENAME TO "PeriodSlot";
ALTER TABLE "PeriodSlot" RENAME CONSTRAINT "Period_pkey" TO "PeriodSlot_pkey";
ALTER TABLE "PeriodSlot" RENAME CONSTRAINT "Period_schoolId_fkey" TO "PeriodSlot_schoolId_fkey";
ALTER INDEX "Period_schoolId_index_key" RENAME TO "PeriodSlot_schoolId_index_key";

-- New tables for the bell-schedule-variant model.
CREATE TABLE "BellSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BellSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BellSchedulePeriod" (
    "id" TEXT NOT NULL,
    "bellScheduleId" TEXT NOT NULL,
    "periodSlotId" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,

    CONSTRAINT "BellSchedulePeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolDay" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bellScheduleId" TEXT NOT NULL,

    CONSTRAINT "SchoolDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BellSchedule_schoolId_name_key" ON "BellSchedule"("schoolId", "name");
CREATE UNIQUE INDEX "BellSchedulePeriod_bellScheduleId_periodSlotId_key" ON "BellSchedulePeriod"("bellScheduleId", "periodSlotId");
CREATE UNIQUE INDEX "SchoolDay_schoolId_date_key" ON "SchoolDay"("schoolId", "date");

ALTER TABLE "BellSchedule" ADD CONSTRAINT "BellSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BellSchedulePeriod" ADD CONSTRAINT "BellSchedulePeriod_bellScheduleId_fkey" FOREIGN KEY ("bellScheduleId") REFERENCES "BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BellSchedulePeriod" ADD CONSTRAINT "BellSchedulePeriod_periodSlotId_fkey" FOREIGN KEY ("periodSlotId") REFERENCES "PeriodSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolDay" ADD CONSTRAINT "SchoolDay_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolDay" ADD CONSTRAINT "SchoolDay_bellScheduleId_fkey" FOREIGN KEY ("bellScheduleId") REFERENCES "BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: give every school with existing periods a "Regular Day" default
-- BellSchedule, and copy each PeriodSlot's current start/end times into it.
INSERT INTO "BellSchedule" ("id", "schoolId", "name", "isDefault")
SELECT gen_random_uuid()::text, s."id", 'Regular Day', true
FROM "School" s
WHERE EXISTS (SELECT 1 FROM "PeriodSlot" ps WHERE ps."schoolId" = s."id");

INSERT INTO "BellSchedulePeriod" ("id", "bellScheduleId", "periodSlotId", "startMinutes", "endMinutes")
SELECT gen_random_uuid()::text, bs."id", ps."id", ps."startMinutes", ps."endMinutes"
FROM "PeriodSlot" ps
JOIN "BellSchedule" bs ON bs."schoolId" = ps."schoolId" AND bs."isDefault" = true;

-- Now that timing lives in BellSchedulePeriod, drop it from the canonical PeriodSlot.
ALTER TABLE "PeriodSlot" DROP COLUMN "startMinutes";
ALTER TABLE "PeriodSlot" DROP COLUMN "endMinutes";
