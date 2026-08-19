"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeacherForm } from "@/lib/validation/teacher";

export function TeacherFormFields({ form }: { form: UseFormReturn<TeacherForm> }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="teacher-name">Name</Label>
        <Input id="teacher-name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="teacher-email">Email</Label>
        <Input id="teacher-email" type="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="teacher-room">Room (optional)</Label>
        <Input id="teacher-room" {...form.register("room")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="teacher-phone">Phone (optional)</Label>
        <Input id="teacher-phone" type="tel" {...form.register("phone")} />
      </div>
    </>
  );
}
