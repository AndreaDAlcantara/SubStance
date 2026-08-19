-- AlterTable: add unique constraint for matching teachers by email within a school (bulk upload upsert key)
CREATE UNIQUE INDEX "Teacher_schoolId_email_key" ON "Teacher"("schoolId", "email");
