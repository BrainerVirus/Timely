import type React from "react";
import type { ScheduleTick } from "@/domains/schedule/lib/schedule-visualization";
import { ScheduleWorkspaceDayColumn } from "@/domains/schedule/ui/ScheduleWorkspace/internal/ScheduleWorkspaceDayColumn/ScheduleWorkspaceDayColumn";
import { ScheduleTickLine } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleTickLine";
import {
  DAY_COLUMN_MIN_WIDTH,
  HEADER_HEIGHT,
  TIME_RAIL_WIDTH,
  formatHourLabel,
  HOUR_ROW_HEIGHT,
} from "@/domains/schedule/ui/ScheduleWorkspace/lib/schedule-workspace-helpers";
import { cn } from "@/shared/lib/utils";

import type { WeekdayCode, WeekdayScheduleFormRow } from "@/domains/schedule/state/schedule-form/schedule-form";

export interface ScheduleWorkspaceCanvasProps {
  orderedWorkdays: readonly WeekdayCode[];
  scheduleByDay: Map<WeekdayCode, WeekdayScheduleFormRow>;
  selectedDay: WeekdayCode;
  setSelectedDay: (day: WeekdayCode) => void;
  ticks: ScheduleTick[];
  hourTicks: ScheduleTick[];
  axisStartMinutes: number;
  axisEndMinutes: number;
  totalHeight: number;
  calendarTrackWidth: number;
  viewportHeight: number;
  bodyViewportHeight: number;
  dayHeaderTrackReference: React.RefObject<HTMLDivElement | null>;
  dayBodyViewportReference: React.RefObject<HTMLDivElement | null>;
  timeRailReference: React.RefObject<HTMLDivElement | null>;
  handleCalendarViewportScroll: (event: React.UIEvent<HTMLDivElement, UIEvent>) => void;
  formatWeekdayFromCode: (day: WeekdayCode, style?: "long" | "short" | undefined) => string;
  dayOffLabel: string;
  hoursLabel: string;
  lunchBreakLabel: string;
}

export function ScheduleWorkspaceCanvas({
  orderedWorkdays,
  scheduleByDay,
  selectedDay,
  setSelectedDay,
  ticks,
  hourTicks,
  axisStartMinutes,
  axisEndMinutes,
  totalHeight,
  calendarTrackWidth,
  viewportHeight,
  bodyViewportHeight,
  dayHeaderTrackReference,
  dayBodyViewportReference,
  timeRailReference,
  handleCalendarViewportScroll,
  formatWeekdayFromCode,
  dayOffLabel,
  hoursLabel,
  lunchBreakLabel,
}: Readonly<ScheduleWorkspaceCanvasProps>) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border-2 border-border-subtle bg-panel shadow-clay">
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns: `${TIME_RAIL_WIDTH}px minmax(0, 1fr)`,
          gridTemplateRows: `${HEADER_HEIGHT}px minmax(0, 1fr)`,
          height: `${viewportHeight}px`,
        }}
      >
        <div className="flex items-end border-r border-b-2 border-border-subtle bg-panel-elevated px-3 py-4">
          <span className="text-[0.72rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            {hoursLabel}
          </span>
        </div>

        <div className="overflow-hidden border-b-2 border-border-subtle bg-panel-elevated">
          <div
            ref={dayHeaderTrackReference}
            className="grid will-change-transform"
            style={{
              width: `${calendarTrackWidth}px`,
              gridTemplateColumns: `repeat(${orderedWorkdays.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
              gridTemplateRows: `${HEADER_HEIGHT}px`,
            }}
          >
            {orderedWorkdays.map((day, index) => {
              const selected = day === selectedDay;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "relative min-w-0 bg-panel-elevated px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    index > 0 && "border-l border-border-subtle/70",
                    selected ? "bg-panel" : "hover:bg-panel",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 transition-opacity",
                      selected ? "bg-primary opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex min-w-0 items-center pt-1">
                    <p className="font-display text-base font-bold text-foreground">
                      {formatWeekdayFromCode(day)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={timeRailReference}
          className="min-h-0 overflow-hidden border-r border-border-subtle bg-panel"
          style={{ height: `${bodyViewportHeight}px` }}
        >
          <div className="relative" style={{ height: `${totalHeight}px` }}>
            {ticks.map((tick) => (
              <ScheduleTickLine
                key={`time-rail-${tick.minute}`}
                tick={tick}
                showMajor={tick.minute !== axisStartMinutes}
              />
            ))}
            {hourTicks.map((tick, index) => (
              <div
                key={`time-label-${tick.minute}`}
                className="pointer-events-none absolute inset-x-0 px-3"
                style={{ top: `${tick.topPx}px`, height: `${HOUR_ROW_HEIGHT}px` }}
              >
                <div
                  className={cn(
                    "flex items-start text-[0.82rem] font-medium text-muted-foreground tabular-nums [text-shadow:0_1px_0_color-mix(in_oklab,var(--color-panel)_75%,transparent)]",
                    index === 0 ? "pt-[0.7rem]" : "pt-3",
                  )}
                >
                  {formatHourLabel(tick.minute)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div
            ref={dayBodyViewportReference}
            data-testid="schedule-calendar-viewport"
            className="h-full overflow-auto overscroll-contain scroll-smooth [scrollbar-gutter:stable]"
            onScroll={handleCalendarViewportScroll}
          >
            <div
              className="grid min-w-max"
              style={{
                width: `${calendarTrackWidth}px`,
                minWidth: `${calendarTrackWidth}px`,
                gridTemplateColumns: `repeat(${orderedWorkdays.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
                gridTemplateRows: `${totalHeight}px`,
              }}
            >
              {orderedWorkdays.map((day, index) => {
                const schedule = scheduleByDay.get(day);
                if (!schedule) {
                  return null;
                }

                return (
                  <ScheduleWorkspaceDayColumn
                    key={day}
                    axisEndMinutes={axisEndMinutes}
                    axisStartMinutes={axisStartMinutes}
                    day={day}
                    dayOffLabel={dayOffLabel}
                    index={index}
                    lunchBreakLabel={lunchBreakLabel}
                    schedule={schedule}
                    selected={day === selectedDay}
                    setSelectedDay={setSelectedDay}
                    ticks={ticks}
                    totalHeight={totalHeight}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
