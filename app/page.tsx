import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const setupSteps = [
  {
    title: "Bell schedule",
    description: "Set your school's periods and times.",
    href: "/school/bell-schedule",
  },
  {
    title: "Teachers",
    description: "Add teachers and their daily schedule.",
    href: "/teachers",
  },
  {
    title: "Substitutes",
    description: "Keep a directory of subs you can call on.",
    href: "/substitutes",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <Badge variant="secondary" className="w-fit self-center sm:self-start">
            Setup
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">SubStance</h1>
          <p className="text-muted-foreground text-lg">
            Get more coverage out of the subs you already have today.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {setupSteps.map((step, i) => (
            <Link key={step.href} href={step.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
