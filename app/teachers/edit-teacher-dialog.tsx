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
import { updateTeacher } from "./actions";
import { TeacherFormFields } from "./teacher-form-fields";

export function EditTeacherDialog({
  teacherId,
  teacher,
}: {
  teacherId: string;
  teacher: { name: string; email: string; phone: string | null; room: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TeacherForm>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone ?? "",
      room: teacher.room ?? "",
    },
  });

  function onSubmit(values: TeacherForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateTeacher(teacherId, values);
      if (result.success) {
        toast.success("Teacher updated");
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
          form.reset({
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone ?? "",
            room: teacher.room ?? "",
          });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Edit
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit teacher</DialogTitle>
            <DialogDescription>Update {teacher.name}&apos;s details.</DialogDescription>
          </DialogHeader>

          <TeacherFormFields form={form} />

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
