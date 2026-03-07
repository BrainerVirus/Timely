import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

export function Select({
  className,
  children,
  ref,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: React.Ref<HTMLSelectElement>;
}) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-border bg-muted px-3 py-2 pr-8 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
