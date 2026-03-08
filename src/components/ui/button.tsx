import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import type * as React from "react";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        ghost: "border border-border bg-transparent px-5 py-2.5 text-foreground hover:bg-muted",
        soft: "border border-primary/15 bg-primary/10 px-5 py-2.5 text-primary hover:bg-primary/15",
        destructive:
          "border border-destructive/20 bg-destructive/10 px-5 py-2.5 text-destructive hover:bg-destructive/20",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({ className, variant, size, ref, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  );
}
