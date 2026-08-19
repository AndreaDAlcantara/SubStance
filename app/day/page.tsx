import { redirect } from "next/navigation";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { todayDayKey } from "@/lib/day";

export const dynamic = "force-dynamic";

export default async function DayIndexPage() {
  const school = await getOrCreateDefaultSchool();
  redirect(`/day/${todayDayKey(school.timezone)}/absences`);
}
