import {
  getNeutralSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";

export interface ScheduleDayStatusToggleProps {
  enabled: boolean;
  workingDayLabel: string;
  dayOffLabel: string;
  onSetEnabled: (enabled: boolean) => void;
  className?: string;
  buttonClassName?: string;
}

export function ScheduleDayStatusToggle({
  enabled,
  workingDayLabel,
  dayOffLabel,
  onSetEnabled,
  className,
  buttonClassName,
}: Readonly<ScheduleDayStatusToggleProps>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onSetEnabled(true)}
        className={getNeutralSegmentedControlClassName(enabled, cn("px-3 text-xs font-bold", buttonClassName))}
      >
        {workingDayLabel}
      </button>
      <button
        type="button"
        onClick={() => onSetEnabled(false)}
        className={getNeutralSegmentedControlClassName(
          !enabled,
          cn("px-3 text-xs font-bold", buttonClassName),
        )}
      >
        {dayOffLabel}
      </button>
    </div>
  );
}
