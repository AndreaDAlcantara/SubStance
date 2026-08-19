import Link from "next/link";
import { formatDayLong } from "@/lib/day";
import { RosterUpload } from "./roster-upload";

export const dynamic = "force-dynamic";

export default async function RosterUploadPage({
  params,
}: PageProps<"/day/[date]/subs/upload">) {
  const { date: dayKey } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/day/${dayKey}/subs`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Who&apos;s subbing
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">
          Load {formatDayLong(dayKey)}
        </h2>
        <p className="text-muted-foreground text-sm">
          Bring in the substitutes already scheduled for this day.
        </p>
      </div>

      <RosterUpload dayKey={dayKey} />
    </div>
  );
}
