-- The sub's ID in the district staffing system (same one county HR uses). Also the
-- match key for importing a day's roster. Nullable: a sub can be added by hand before
-- anyone looks the number up. Postgres treats NULLs as distinct, so the unique index
-- still allows many subs without one.
ALTER TABLE "Substitute" ADD COLUMN "subId" TEXT;
CREATE UNIQUE INDEX "Substitute_schoolId_subId_key" ON "Substitute"("schoolId", "subId");

-- Sub-side emergencies: never turned up, or went home partway through the day.
CREATE TYPE "SubDayStatus" AS ENUM ('PRESENT', 'NO_SHOW');
ALTER TABLE "SubDayEntry" ADD COLUMN "status" "SubDayStatus" NOT NULL DEFAULT 'PRESENT';
ALTER TABLE "SubDayEntry" ADD COLUMN "lastPeriodId" TEXT;
ALTER TABLE "SubDayEntry" ADD CONSTRAINT "SubDayEntry_lastPeriodId_fkey" FOREIGN KEY ("lastPeriodId") REFERENCES "PeriodSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
