"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/day", label: "Today" },
  { href: "/school/bell-schedule", label: "Bell schedule" },
  { href: "/teachers", label: "Teachers" },
  { href: "/substitutes", label: "Substitutes" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-4 sm:gap-6 sm:px-8">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight">
          SubStance
        </Link>
        {/* Scrolls rather than wrapping to two lines on narrow phones. */}
        <nav className="-mx-1 flex gap-4 overflow-x-auto px-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
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
