"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const steps = [
  { slug: "absences", label: "Who's out" },
  { slug: "subs", label: "Who's subbing" },
];

export function DaySteps({ dayKey }: { dayKey: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2">
      {steps.map((step, i) => {
        const href = `/day/${dayKey}/${step.slug}`;
        const active = pathname === href;
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
  );
}
