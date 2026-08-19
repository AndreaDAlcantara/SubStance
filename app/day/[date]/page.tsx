import { redirect } from "next/navigation";

export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params;
  redirect(`/day/${date}/absences`);
}
