import { cn } from "@/lib/utils";

import type * as React from "react";

export function Label({
  children,
  className,
  htmlFor,
  ...props
}: Readonly<React.LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-sm leading-none font-medium text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
