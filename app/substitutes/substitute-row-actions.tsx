"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deactivateSubstitute } from "./actions";

export function DeactivateSubstituteButton({
  substituteId,
  substituteName,
}: {
  substituteId: string;
  substituteName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Remove ${substituteName} from your substitute list?`)) return;
        startTransition(async () => {
          const result = await deactivateSubstitute(substituteId);
          if (result.success) {
            toast.success(`${substituteName} removed`);
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
