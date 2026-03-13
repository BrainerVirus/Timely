import { cn } from "@/lib/utils";

import type * as React from "react";

export const inputBaseClassName =
  "flex h-[var(--control-height-default)] w-full rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-3 py-2 text-sm text-foreground shadow-[var(--shadow-clay-inset)] transition outline-none placeholder:text-muted-foreground/50 selection:bg-primary selection:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-field-hover)]";

export function Input({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return (
    <input
      className={cn(
        inputBaseClassName,
        "focus:border-ring focus:ring-2 focus:ring-ring/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}
