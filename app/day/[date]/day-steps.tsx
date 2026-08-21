"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const steps = [
  { slug: "absences", label: "Who's out" },
  { slug: "subs", label: "Who's subbing" },
  { slug: "coverage", label: "Cover a class" },
];

export function DaySteps({ dayKey }: { dayKey: string }) {
  const pathname = usePathname();
  const whereHref = `/day/${dayKey}/where`;
  const whereActive = pathname === whereHref;

  return (
    <div className="flex flex-col gap-2">
      <nav className="flex gap-2">
        {steps.map((step, i) => {
          const href = `/day/${dayKey}/${step.slug}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={step.slug}
              href={href}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                active ? "border-foreground/20 bg-muted font-medium" : "hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              {step.label}
            </Link>
          );
        })}
      </nav>

      {/* Not a step in setting up the day — a lookup you reach for while it runs. */}
      <Link
        href={whereHref}
        className={cn(
          "text-muted-foreground w-fit text-sm hover:text-foreground hover:underline",
          whereActive && "text-foreground font-medium"
        )}
      >
        Where is my sub? →
      </Link>
    </div>
  );
}
