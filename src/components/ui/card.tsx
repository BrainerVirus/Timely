import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-border-subtle bg-panel-elevated p-4 shadow-card transition-shadow hover:shadow-card-hover sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
