import Link from "next/link";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { BellScheduleUpload } from "./bell-schedule-upload";

export const dynamic = "force-dynamic";

export default async function BellScheduleUploadPage() {
  const school = await getOrCreateDefaultSchool();

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link
            href="/school/bell-schedule"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Bell schedule
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Upload bell schedule</h1>
          <p className="text-muted-foreground text-sm">
            Upload a spreadsheet instead of entering periods one by one.
          </p>
        </div>

        <BellScheduleUpload schoolName={school.name} timezone={school.timezone} />
      </div>
    </div>
  );
}
