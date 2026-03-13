import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import type * as React from "react";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-primary/80 bg-primary px-5 py-2.5 text-primary-foreground shadow-[var(--shadow-button-primary)] hover:brightness-110",
        ghost:
          "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-5 py-2.5 text-foreground shadow-[var(--shadow-clay)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-elevated)]",
        soft:
          "border-primary/35 bg-primary/12 px-5 py-2.5 text-primary shadow-[var(--shadow-button-soft)] hover:bg-primary/16",
        destructive:
          "border-destructive/40 bg-destructive/12 px-5 py-2.5 text-destructive shadow-[var(--shadow-button-destructive)] hover:bg-destructive/18",
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
