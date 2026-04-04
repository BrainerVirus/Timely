import {
  buildScheduleCanvasBlock,
  type ScheduleTick,
} from "@/domains/schedule/lib/schedule-visualization";
import { ScheduleTickLine } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleTickLine";
import { cn } from "@/shared/lib/utils";

import type {
  WeekdayCode,
  WeekdayScheduleFormRow,
} from "@/domains/schedule/state/schedule-form/schedule-form";

interface ScheduleWorkspaceDayColumnProps {
  axisStartMinutes: number;
  axisEndMinutes: number;
  day: WeekdayCode;
  dayOffLabel: string;
  index: number;
  lunchBreakLabel: string;
  schedule: WeekdayScheduleFormRow;
  selected: boolean;
  setSelectedDay: (day: WeekdayCode) => void;
  ticks: ScheduleTick[];
  totalHeight: number;
}

export function ScheduleWorkspaceDayColumn({
  axisStartMinutes,
  axisEndMinutes,
  day,
  dayOffLabel,
  index,
  lunchBreakLabel,
  schedule,
  selected,
  setSelectedDay,
  ticks,
  totalHeight,
}: Readonly<ScheduleWorkspaceDayColumnProps>) {
  const block = buildScheduleCanvasBlock(schedule, axisStartMinutes, axisEndMinutes);

  return (
    <button
      type="button"
      onClick={() => setSelectedDay(day)}
      className={cn(
        "relative min-w-0 overflow-hidden text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        index > 0 && "border-l border-border-subtle/70",
        selected ? "bg-primary/5" : "bg-background/20 hover:bg-panel/80",
      )}
      style={{ height: `${totalHeight}px` }}
    >
      {ticks.map((tick) => (
        <ScheduleTickLine
          key={`${day}-${tick.minute}`}
          tick={tick}
          showMajor={tick.minute !== axisStartMinutes}
        />
      ))}

      {block ? (
        <div
          className={cn(
            "absolute inset-x-3 rounded-[1.15rem] border-2 border-primary/35 bg-linear-to-b from-primary/34 via-primary/24 to-accent/18 shadow-clay",
            selected && "border-primary/50",
          )}
          style={{
            top: `${block.workTopPercent}%`,
            height: `${block.workHeightPercent}%`,
          }}
        >
          <div className="flex h-full flex-col justify-between p-2.5">
            <div className="text-[0.8rem] font-bold tracking-[0.06em] text-primary tabular-nums">
              {schedule.shiftStart}
            </div>
            <div className="text-right text-[0.8rem] font-bold tracking-[0.06em] text-primary tabular-nums">
              {schedule.shiftEnd}
            </div>
          </div>
          {block.lunchTopPercent !== null && block.lunchHeightPercent !== null ? (
            <div
              className="absolute inset-x-1.5 flex items-center justify-center rounded-xl border border-background/70 bg-background/88 px-2 shadow-clay-inset"
              style={{
                top: `${block.lunchTopPercent - block.workTopPercent}%`,
                height: `${block.lunchHeightPercent}%`,
              }}
            >
              <span className="truncate text-[0.62rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                {lunchBreakLabel}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-2xl border-2 border-dashed border-border-subtle bg-panel/70 px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
          {dayOffLabel}
        </div>
      )}
    </button>
  );
}
