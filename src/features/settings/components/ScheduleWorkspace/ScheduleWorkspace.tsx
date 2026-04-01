import Clock3 from "lucide-react/dist/esm/icons/clock-3.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import * as React from "react";
import { useI18n } from "@/core/services/I18nService/i18n";
import {
  buildScheduleCanvasBlock,
  buildScheduleTicks,
  formatWeekdayScheduleHours,
  getScheduleAxisBounds,
  getWeekdayScheduleSignature,
  groupWeekdaySchedules,
  type ScheduleTick,
  type WeekdayCode,
  type WeekdayScheduleFormRow,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { Input } from "@/shared/components/Input/Input";
import { Label } from "@/shared/components/Label/Label";
import { TimeInput } from "@/shared/components/TimeInput/TimeInput";
import {
  getChoiceButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/shared/utils/control-styles";
import { cn, WEEKDAY_ORDER } from "@/shared/utils/utils";

const DAY_COLUMN_MIN_WIDTH = 156;
const HOUR_ROW_HEIGHT = 56;
const HEADER_HEIGHT = 68;
const TIME_RAIL_WIDTH = 72;

export interface ScheduleWorkspaceProps {
  weekdaySchedules: WeekdayScheduleFormRow[];
  orderedWorkdays: WeekdayCode[];
  onSetWeekdayEnabled: (day: WeekdayCode, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayCode,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayCode, targetDays: WeekdayCode[]) => void;
}

export function ScheduleWorkspace({
  weekdaySchedules,
  orderedWorkdays,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
}: Readonly<ScheduleWorkspaceProps>) {
  const { formatWeekdayFromCode, t } = useI18n();
  const editorCardReference = React.useRef<HTMLDivElement | null>(null);
  const dayBodyViewportReference = React.useRef<HTMLDivElement | null>(null);
  const dayHeaderTrackReference = React.useRef<HTMLDivElement | null>(null);
  const timeRailReference = React.useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledReference = React.useRef(false);
  const [selectedDay, setSelectedDay] = React.useState<WeekdayCode>(
    getInitialSelectedDay(weekdaySchedules, orderedWorkdays),
  );
  const [selectedApplyDays, setSelectedApplyDays] = React.useState<WeekdayCode[]>([]);
  const [calendarViewportHeight, setCalendarViewportHeight] = React.useState<number | null>(null);
  const scheduleByDay = new Map(
    weekdaySchedules.map((schedule) => [schedule.day, schedule] as const),
  );
  const selectedSchedule =
    scheduleByDay.get(selectedDay) ?? scheduleByDay.get(orderedWorkdays[0] ?? "Mon");
  const patternGroups = groupWeekdaySchedules(weekdaySchedules, orderedWorkdays);
  const { axisStartMinutes, axisEndMinutes } = getScheduleAxisBounds(weekdaySchedules);
  const selectedGroup =
    patternGroups.find((group) => group.days.includes(selectedDay)) ??
    (selectedSchedule
      ? {
          signature: getWeekdayScheduleSignature(selectedSchedule),
          days: [selectedDay],
          schedule: selectedSchedule,
        }
      : undefined);
  const selectedGroupDaysKey = selectedGroup?.days.join("|") ?? "";
  const matchingDays = selectedGroup?.days.filter((day) => day !== selectedDay) ?? [];
  const ticks = React.useMemo(
    () => buildScheduleTicks(axisStartMinutes, axisEndMinutes, HOUR_ROW_HEIGHT),
    [axisEndMinutes, axisStartMinutes],
  );
  const hourTicks = React.useMemo(
    () => ticks.filter((tick) => tick.kind === "hour" && tick.minute < axisEndMinutes),
    [axisEndMinutes, ticks],
  );
  const totalHeight = ((axisEndMinutes - axisStartMinutes) / 60) * HOUR_ROW_HEIGHT;
  const previewWeek = orderedWorkdays.map((day) => ({ day }));
  const calendarTrackWidth = previewWeek.length * DAY_COLUMN_MIN_WIDTH;
  const viewportHeight = calendarViewportHeight ?? 544;
  const bodyViewportHeight = Math.max(viewportHeight - HEADER_HEIGHT, 240);

  React.useEffect(() => {
    const hasSelectedDay = weekdaySchedules.some((schedule) => schedule.day === selectedDay);
    const nextSelectedDay = hasSelectedDay
      ? selectedDay
      : getInitialSelectedDay(weekdaySchedules, orderedWorkdays);

    if (nextSelectedDay !== selectedDay) {
      setSelectedDay(nextSelectedDay);
    }
  }, [orderedWorkdays, selectedDay, weekdaySchedules]);

  React.useEffect(() => {
    setSelectedApplyDays(
      selectedGroupDaysKey
        ? selectedGroupDaysKey
            .split("|")
            .filter(
              (day): day is WeekdayCode =>
                day !== selectedDay && WEEKDAY_ORDER.includes(day as WeekdayCode),
            )
        : [],
    );
  }, [selectedDay, selectedGroupDaysKey]);

  React.useLayoutEffect(() => {
    const element = editorCardReference.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setCalendarViewportHeight(Math.ceil(element.getBoundingClientRect().height));
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedApplyDays.length, selectedDay, selectedSchedule?.enabled]);

  React.useLayoutEffect(() => {
    const viewport = dayBodyViewportReference.current;
    if (!viewport || !calendarViewportHeight || hasAutoScrolledReference.current) {
      return;
    }

    const nextScrollTop = getInitialScheduleScrollTop(weekdaySchedules, axisStartMinutes);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        viewport.scrollTop = nextScrollTop;
        if (timeRailReference.current) {
          timeRailReference.current.scrollTop = nextScrollTop;
        }
        hasAutoScrolledReference.current = true;
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [axisStartMinutes, calendarViewportHeight, weekdaySchedules]);

  if (!selectedSchedule) {
    return null;
  }

  function handleCalendarViewportScroll(
    event: React.UIEvent<HTMLDivElement, UIEvent>,
  ) {
    if (dayHeaderTrackReference.current) {
      dayHeaderTrackReference.current.style.transform = `translateX(${-event.currentTarget.scrollLeft}px)`;
    }

    if (timeRailReference.current) {
      timeRailReference.current.scrollTop = event.currentTarget.scrollTop;
    }
  }

  function applyToDays(targetDays: WeekdayCode[]) {
    const sanitizedTargetDays = targetDays.filter((day) => day !== selectedDay);

    if (sanitizedTargetDays.length === 0) {
      return;
    }

    onCopyWeekdaySchedule(selectedDay, sanitizedTargetDays);
  }

  function toggleSelectedApplyDay(day: WeekdayCode) {
    setSelectedApplyDays((current) =>
      current.includes(day)
        ? current.filter((candidate) => candidate !== day)
        : [...current, day],
    );
  }

  return (
    <div className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
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
              {t("settings.hours")}
            </span>
          </div>

          <div className="overflow-hidden border-b-2 border-border-subtle bg-panel-elevated">
            <div
              ref={dayHeaderTrackReference}
              className="grid will-change-transform"
              style={{
                width: `${calendarTrackWidth}px`,
                gridTemplateColumns: `repeat(${previewWeek.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
                gridTemplateRows: `${HEADER_HEIGHT}px`,
              }}
            >
              {previewWeek.map((previewDay, index) => {
                const selected = previewDay.day === selectedDay;

                return (
                  <button
                    key={previewDay.day}
                    type="button"
                    onClick={() => setSelectedDay(previewDay.day)}
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
                        {formatWeekdayFromCode(previewDay.day)}
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
                  gridTemplateColumns: `repeat(${previewWeek.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
                  gridTemplateRows: `${totalHeight}px`,
                }}
              >
                {previewWeek.map((previewDay, index) => {
                  const schedule = scheduleByDay.get(previewDay.day);
                  if (!schedule) {
                    return null;
                  }

                  const block = buildScheduleCanvasBlock(
                    schedule,
                    axisStartMinutes,
                    axisEndMinutes,
                  );
                  const selected = previewDay.day === selectedDay;

                  return (
                    <button
                      key={previewDay.day}
                      type="button"
                      onClick={() => setSelectedDay(previewDay.day)}
                      className={cn(
                        "relative min-w-0 overflow-hidden text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                        index > 0 && "border-l border-border-subtle/70",
                        selected ? "bg-primary/5" : "bg-background/20 hover:bg-panel/80",
                      )}
                      style={{ height: `${totalHeight}px` }}
                    >
                      {ticks.map((tick) => (
                        <ScheduleTickLine
                          key={`${previewDay.day}-${tick.minute}`}
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
                                {t("settings.lunchBreak")}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-2xl border-2 border-dashed border-border-subtle bg-panel/70 px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
                          {t("settings.dayOff")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={editorCardReference}
        className="rounded-[1.75rem] border-2 border-border-subtle bg-panel p-4 shadow-clay xl:w-full xl:max-w-[30rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {formatWeekdayFromCode(selectedDay, "long")}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSetWeekdayEnabled(selectedDay, true)}
              className={getNeutralSegmentedControlClassName(
                selectedSchedule.enabled,
                "px-3 text-xs font-bold",
              )}
            >
              {t("settings.workingDay")}
            </button>
            <button
              type="button"
              onClick={() => onSetWeekdayEnabled(selectedDay, false)}
              className={getNeutralSegmentedControlClassName(
                !selectedSchedule.enabled,
                "px-3 text-xs font-bold",
              )}
            >
              {t("settings.dayOff")}
            </button>
          </div>
        </div>

        <div className={cn("mt-4 space-y-4", !selectedSchedule.enabled && "opacity-60")}>
          <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(11rem,12.5rem))] sm:justify-start">
            <WorkspaceTimeField
              day={selectedDay}
              field="shiftStart"
              label={t("settings.shiftStart")}
              icon={Clock3}
              value={selectedSchedule.shiftStart}
              disabled={!selectedSchedule.enabled}
              onSetWeekdayField={onSetWeekdayField}
            />
            <WorkspaceTimeField
              day={selectedDay}
              field="shiftEnd"
              label={t("settings.shiftEnd")}
              icon={Clock3}
              value={selectedSchedule.shiftEnd}
              disabled={!selectedSchedule.enabled}
              onSetWeekdayField={onSetWeekdayField}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(8rem,9rem)_minmax(8rem,10rem)] sm:justify-start">
            <div className="w-full max-w-[9rem] space-y-1.5">
              <Label
                htmlFor={`${selectedDay}-workspace-lunch`}
                className="flex items-center gap-1.5"
              >
                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.lunchBreak")}
              </Label>
              <Input
                id={`${selectedDay}-workspace-lunch`}
                type="number"
                step="5"
                min="0"
                max="180"
                disabled={!selectedSchedule.enabled}
                value={selectedSchedule.lunchMinutes}
                onChange={(event) =>
                  onSetWeekdayField(selectedDay, "lunchMinutes", event.target.value)
                }
              />
            </div>

            <div className="w-full max-w-[10rem] space-y-1.5">
              <Label className="text-muted-foreground">{t("settings.netHoursPerDay")}</Label>
              <div className="flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4 shadow-clay-inset">
                <span className="font-display text-sm font-bold text-primary tabular-nums">
                  {selectedSchedule.enabled
                    ? t("settings.hoursPerDaySummary", {
                        hours: formatWeekdayScheduleHours(selectedSchedule),
                      })
                    : "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <Label>{t("settings.applyToSelectedDays")}</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {orderedWorkdays.map((day) => {
                const disabled = day === selectedDay;
                const active = selectedApplyDays.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleSelectedApplyDay(day)}
                    className={getNeutralSegmentedControlClassName(
                      active,
                      "px-3 text-xs font-bold disabled:opacity-40",
                    )}
                  >
                    {formatWeekdayFromCode(day)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid max-w-[28rem] gap-2">
            <button
              type="button"
              onClick={() => applyToDays(matchingDays)}
              disabled={matchingDays.length === 0}
              className={getChoiceButtonClassName(false, "w-full justify-between px-4 text-left")}
            >
              <span>{t("settings.applyToMatchingDays")}</span>
              <span className="text-xs text-muted-foreground">
                {matchingDays.length > 0
                  ? matchingDays.map((day) => formatWeekdayFromCode(day)).join(", ")
                  : t("common.none")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => applyToDays(selectedApplyDays)}
              disabled={selectedApplyDays.length === 0}
              className={getChoiceButtonClassName(false, "w-full justify-between px-4 text-left")}
            >
              <span>{t("settings.applyToSelectedDays")}</span>
              <span className="text-xs text-muted-foreground">
                {selectedApplyDays.length > 0
                  ? selectedApplyDays.map((day) => formatWeekdayFromCode(day)).join(", ")
                  : t("common.none")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => applyToDays(orderedWorkdays)}
              className={getChoiceButtonClassName(false, "w-full justify-between px-4 text-left")}
            >
              <span>{t("settings.applyToWholeWeek")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.wholeWeekLabel")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleTickLine({
  tick,
  showMajor,
}: Readonly<{
  tick: ScheduleTick;
  showMajor: boolean;
}>) {
  if (tick.kind === "hour" && !showMajor) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 border-t",
        tick.kind === "hour"
          ? "border-border-subtle/80"
          : "border-border-subtle/35",
      )}
      style={{ top: `${tick.topPx}px` }}
    />
  );
}

function WorkspaceTimeField({
  day,
  field,
  label,
  icon: Icon,
  value,
  disabled,
  onSetWeekdayField,
}: Readonly<{
  day: WeekdayCode;
  field: "shiftStart" | "shiftEnd";
  label: string;
  icon: typeof Clock3;
  value: string;
  disabled: boolean;
  onSetWeekdayField: ScheduleWorkspaceProps["onSetWeekdayField"];
}>) {
  return (
    <div className="w-full max-w-[12.5rem] space-y-1.5">
      <Label htmlFor={`${day}-${field}-workspace`} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <TimeInput
        id={`${day}-${field}-workspace`}
        value={value}
        disabled={disabled}
        onChange={(nextValue) => onSetWeekdayField(day, field, nextValue)}
      />
    </div>
  );
}

function getInitialSelectedDay(
  weekdaySchedules: WeekdayScheduleFormRow[],
  orderedWorkdays: WeekdayCode[],
): WeekdayCode {
  const enabledDay = orderedWorkdays.find((day) =>
    weekdaySchedules.some((schedule) => schedule.day === day && schedule.enabled),
  );

  return enabledDay ?? orderedWorkdays[0] ?? "Mon";
}

function getInitialScheduleScrollTop(
  weekdaySchedules: WeekdayScheduleFormRow[],
  axisStartMinutes: number,
): number {
  const startMinutes = weekdaySchedules
    .filter((schedule) => schedule.enabled)
    .map((schedule) => parseScheduleTime(schedule.shiftStart))
    .filter((value): value is number => value !== null);

  if (startMinutes.length === 0) {
    return 0;
  }

  const earliestStart = Math.min(...startMinutes);
  const focusStart = Math.max(earliestStart - 60, axisStartMinutes);
  return ((focusStart - axisStartMinutes) / 60) * HOUR_ROW_HEIGHT;
}

function formatHourLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:00`;
}

function parseScheduleTime(value: string): number | null {
  const [hoursPart = "", minutesPart = ""] = value.split(":");
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}
