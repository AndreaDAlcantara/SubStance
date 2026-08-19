import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultSchool } from "@/lib/school";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneLink } from "@/components/phone-link";
import { AddSubstituteDialog } from "./add-substitute-dialog";
import { EditSubstituteDialog } from "./edit-substitute-dialog";
import { DeactivateSubstituteButton } from "./substitute-row-actions";

export const dynamic = "force-dynamic";

export default async function SubstitutesPage() {
  const school = await getOrCreateDefaultSchool();
  const substitutes = await prisma.substitute.findMany({
    where: { schoolId: school.id, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Substitutes</h1>
            <p className="text-muted-foreground text-sm">
              Everyone you can call on. Each day you&apos;ll pick which of them are working.
            </p>
          </div>
          <div className="shrink-0">
            <AddSubstituteDialog />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {substitutes.map((substitute) => (
            <Card key={substitute.id}>
              <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                <div className="flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {substitute.name}
                    {substitute.subId && (
                      <Badge variant="outline" className="font-normal">
                        ID {substitute.subId}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {substitute.email}
                    {substitute.notes ? ` · ${substitute.notes}` : ""}
                  </CardDescription>
                  <PhoneLink phone={substitute.phone} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <EditSubstituteDialog
                    substituteId={substitute.id}
                    substitute={{
                      subId: substitute.subId,
                      name: substitute.name,
                      email: substitute.email,
                      phone: substitute.phone,
                      notes: substitute.notes,
                    }}
                  />
                  <DeactivateSubstituteButton
                    substituteId={substitute.id}
                    substituteName={substitute.name}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
          {substitutes.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No substitutes yet — click &quot;Add substitute&quot; to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
