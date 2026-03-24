import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/utils";

import type * as React from "react";

export const inputVariants = cva(
  "flex h-10 w-full rounded-xl border-2 bg-field px-3 py-2 text-sm text-foreground shadow-clay-inset transition outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground/50 hover:border-border-strong hover:bg-field-hover focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
  {
    defaultVariants: {
      border: "default",
    },
    variants: {
      border: {
        default: "border-border-subtle",
      },
    },
  },
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants> & {
    ref?: React.Ref<HTMLInputElement>;
  };

export function Input({ className, border, ref, ...props }: InputProps) {
  return <input className={cn(inputVariants({ border }), className)} ref={ref} {...props} />;
}
