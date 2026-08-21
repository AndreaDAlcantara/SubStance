"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 60_000;

/**
 * This board answers "where is everyone *now*", so it has to follow the bell
 * rather than whatever moment the page happened to be opened at. Refreshing on
 * the minute keeps it honest without the admin thinking to reload.
 *
 * The timestamp comes from the server render, so it reflects when the data was
 * actually read — and updates on its own with each refresh.
 */
export function LiveClock({ checkedAt }: { checkedAt: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <p className="text-muted-foreground text-xs">
      Updating every minute · last checked {checkedAt}
    </p>
  );
}
