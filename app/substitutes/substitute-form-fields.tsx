"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubstituteForm } from "@/lib/validation/substitute";

export function SubstituteFormFields({ form }: { form: UseFormReturn<SubstituteForm> }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-name">Name</Label>
        <Input id="sub-name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-email">Email</Label>
        <Input id="sub-email" type="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-phone">Phone (optional)</Label>
        <Input id="sub-phone" type="tel" {...form.register("phone")} />
        <p className="text-muted-foreground text-xs">
          Needed to text them about coverage changes.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-notes">Notes (optional)</Label>
        <Input id="sub-notes" {...form.register("notes")} placeholder="Prefers middle school" />
      </div>
    </>
  );
}
