"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/school/bell-schedule", label: "Bell schedule" },
  { href: "/teachers", label: "Teachers" },
  { href: "/substitutes", label: "Substitutes" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-6 px-4 py-4 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          SubStance
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground",
                  active && "text-foreground font-medium"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
