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
import { substituteFormSchema, type SubstituteForm } from "@/lib/validation/substitute";
import { createSubstitute } from "./actions";
import { SubstituteFormFields } from "./substitute-form-fields";

export function AddSubstituteDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SubstituteForm>({
    resolver: zodResolver(substituteFormSchema),
    defaultValues: { name: "", email: "", phone: "", notes: "" },
  });

  function onSubmit(values: SubstituteForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await createSubstitute(values);
      if (result.success) {
        toast.success("Substitute added");
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
      <DialogTrigger className={buttonVariants({ size: "sm" })}>Add substitute</DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add substitute</DialogTitle>
            <DialogDescription>
              This is your standing list — you&apos;ll pick who&apos;s actually working each day.
            </DialogDescription>
          </DialogHeader>

          <SubstituteFormFields form={form} />

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add substitute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
