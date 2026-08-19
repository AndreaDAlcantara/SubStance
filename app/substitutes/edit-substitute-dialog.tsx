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
import { updateSubstitute } from "./actions";
import { SubstituteFormFields } from "./substitute-form-fields";

export function EditSubstituteDialog({
  substituteId,
  substitute,
}: {
  substituteId: string;
  substitute: {
    subId: string | null;
    name: string;
    email: string;
    phone: string | null;
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaults = {
    subId: substitute.subId ?? "",
    name: substitute.name,
    email: substitute.email,
    phone: substitute.phone ?? "",
    notes: substitute.notes ?? "",
  };

  const form = useForm<SubstituteForm>({
    resolver: zodResolver(substituteFormSchema),
    defaultValues: defaults,
  });

  function onSubmit(values: SubstituteForm) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateSubstitute(substituteId, values);
      if (result.success) {
        toast.success("Substitute updated");
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
          form.reset(defaults);
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
            <DialogTitle>Edit substitute</DialogTitle>
            <DialogDescription>Update {substitute.name}&apos;s details.</DialogDescription>
          </DialogHeader>

          <SubstituteFormFields form={form} />

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
