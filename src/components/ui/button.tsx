import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import type * as React from "react";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-primary/80 bg-primary px-5 py-2.5 text-primary-foreground shadow-[2px_2px_0_0_var(--color-primary-foreground)] hover:brightness-110",
        ghost:
          "border-border bg-transparent px-5 py-2.5 text-foreground shadow-[2px_2px_0_0_var(--color-border)] hover:bg-muted",
        soft: "border-primary/25 bg-primary/10 px-5 py-2.5 text-primary shadow-[2px_2px_0_0_oklch(from_var(--color-primary)_l_c_h_/_0.15)] hover:bg-primary/15",
        destructive:
          "border-destructive/30 bg-destructive/10 px-5 py-2.5 text-destructive shadow-[2px_2px_0_0_oklch(from_var(--color-destructive)_l_c_h_/_0.15)] hover:bg-destructive/20",
      },
      size: {
        default: "h-[var(--control-height-default)]",
        sm: "h-[var(--control-height-compact)] px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({ className, variant, size, ref, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  );
}
