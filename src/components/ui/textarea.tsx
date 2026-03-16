import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-2 text-base shadow-[var(--shadow-clay-inset)] transition-[color,box-shadow,background-color,border-color] outline-none placeholder:text-muted-foreground hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-field-hover)] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
