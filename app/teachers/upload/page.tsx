import Link from "next/link";
import { TeacherScheduleUpload } from "./teacher-schedule-upload";

export default function TeachersUploadPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/teachers" className="text-muted-foreground text-sm hover:underline">
            ← Teachers
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Upload teacher schedules</h1>
          <p className="text-muted-foreground text-sm">
            Upload a spreadsheet to add or update several teachers at once.
          </p>
        </div>

        <TeacherScheduleUpload />
      </div>
    </div>
  );
}
