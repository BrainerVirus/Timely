import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/Label/Label";
import { TimeInput } from "@/shared/ui/TimeInput/TimeInput";

import type React from "react";

export interface ScheduleTimeFieldProps {
  id: string;
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function ScheduleTimeField({
  id,
  label,
  value,
  icon: Icon,
  onChange,
  ariaLabel,
  disabled = false,
  className,
}: Readonly<ScheduleTimeFieldProps>) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>{label}</span>
      </Label>
      <TimeInput
        id={id}
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
