import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import type * as React from "react";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:translate-y-px active:shadow-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-primary/80 bg-primary px-5 py-2.5 text-primary-foreground shadow-(--shadow-button-primary) hover:brightness-110",
        ghost:
          "border-(--color-border-subtle) bg-panel px-5 py-2.5 text-foreground shadow-(--shadow-clay) hover:border-border-strong hover:bg-panel-elevated",
        soft: "border-primary/35 bg-primary/12 px-5 py-2.5 text-primary shadow-(--shadow-button-soft) hover:bg-primary/16",
        destructive:
          "border-destructive/40 bg-destructive/12 px-5 py-2.5 text-destructive shadow-(--shadow-button-destructive) hover:bg-destructive/18",
      },
      size: {
        default: "h-(--control-height-default)",
        sm: "h-(--control-height-compact) px-3 text-xs",
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

export function Button({ className, variant, size, ref, ...props }: Readonly<ButtonProps>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  );
}
