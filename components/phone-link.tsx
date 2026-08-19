import { PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Until the app can text substitutes itself, reaching one means phoning them —
 * so the number is always one tap away rather than something to go look up. */
export function PhoneLink({
  phone,
  className,
  label,
}: {
  phone: string | null;
  className?: string;
  label?: string;
}) {
  if (!phone) {
    return <span className={cn("text-muted-foreground text-sm", className)}>No phone</span>;
  }

  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium hover:underline",
        className
      )}
    >
      <PhoneIcon className="size-3.5 shrink-0" aria-hidden />
      {label ?? phone}
    </a>
  );
}
