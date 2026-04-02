import { cn } from "@/shared/lib/utils";

import type { ScheduleTick } from "@/domains/schedule/lib/schedule-visualization";

export interface ScheduleTickLineProps {
  tick: ScheduleTick;
  showMajor: boolean;
}

export function ScheduleTickLine({ tick, showMajor }: Readonly<ScheduleTickLineProps>) {
  if (tick.kind === "hour" && !showMajor) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 border-t",
        tick.kind === "hour" ? "border-border-subtle/80" : "border-border-subtle/35",
      )}
      style={{ top: `${tick.topPx}px` }}
    />
  );
}
