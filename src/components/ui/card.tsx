import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
