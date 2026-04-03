import { Label } from "@/shared/ui/Label/Label";
import { cn } from "@/shared/lib/utils";

export interface ScheduleNetHoursFieldProps {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}

export function ScheduleNetHoursField({
  label,
  value,
  className,
  valueClassName,
}: Readonly<ScheduleNetHoursFieldProps>) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label className="text-muted-foreground">{label}</Label>
      <div
        className={cn(
          "flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4",
          valueClassName,
        )}
      >
        <span className="font-display text-sm font-bold text-primary tabular-nums">{value}</span>
      </div>
    </div>
  );
}
