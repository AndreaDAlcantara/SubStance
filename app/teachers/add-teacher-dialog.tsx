"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { teacherFormSchema, type TeacherForm } from "@/lib/validation/teacher";
import { createTeacher } from "./actions";
import { TeacherFormFields } from "./teacher-form-fields";

export function AddTeacherDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TeacherForm>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: { name: "", email: "", phone: "", room: "" },
  });

  function onSubmit(values: TeacherForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await createTeacher(values);
      if (result.success) {
        toast.success("Teacher added");
        form.reset();
        setOpen(false);
      } else {
        setServerError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setServerError(null);
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ size: "sm" })}>Add teacher</DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add teacher</DialogTitle>
            <DialogDescription>
              You&apos;ll set their period-by-period schedule next.
            </DialogDescription>
          </DialogHeader>

          <TeacherFormFields form={form} />

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
