"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deactivateTeacher } from "./actions";

export function DeactivateTeacherButton({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Remove ${teacherName} from the active roster?`)) return;
        startTransition(async () => {
          const result = await deactivateTeacher(teacherId);
          if (result.success) {
            toast.success(`${teacherName} removed`);
          } else {
            toast.error(result.error ?? "Something went wrong");
          }
        });
      }}
    >
      {isPending ? "Removing..." : "Remove"}
    </Button>
  );
}
