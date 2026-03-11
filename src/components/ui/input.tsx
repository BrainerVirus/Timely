import { cn } from "@/lib/utils";

import type * as React from "react";

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
        "flex h-[var(--control-height-default)] w-full rounded-xl border-2 border-border bg-muted px-3 py-2 text-sm text-foreground shadow-[var(--shadow-clay-inset)] transition outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 [&[type='time']]:accent-primary [&[type='time']]:[color-scheme:dark] [&[type='time']::-webkit-calendar-picker-indicator]:opacity-80 [&[type='time']::-webkit-datetime-edit-ampm-field:focus]:rounded-md [&[type='time']::-webkit-datetime-edit-ampm-field:focus]:bg-primary [&[type='time']::-webkit-datetime-edit-ampm-field:focus]:text-primary-foreground [&[type='time']::-webkit-datetime-edit-fields-wrapper]:text-foreground [&[type='time']::-webkit-datetime-edit-hour-field:focus]:rounded-md [&[type='time']::-webkit-datetime-edit-hour-field:focus]:bg-primary [&[type='time']::-webkit-datetime-edit-hour-field:focus]:text-primary-foreground [&[type='time']::-webkit-datetime-edit-minute-field:focus]:rounded-md [&[type='time']::-webkit-datetime-edit-minute-field:focus]:bg-primary [&[type='time']::-webkit-datetime-edit-minute-field:focus]:text-primary-foreground",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}
