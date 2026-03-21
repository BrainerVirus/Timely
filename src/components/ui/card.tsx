import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-(--color-border-subtle) bg-panel-elevated p-4 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover) sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
