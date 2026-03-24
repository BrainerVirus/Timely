import Globe from "lucide-react/dist/esm/icons/globe.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import * as React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { TimeInput } from "@/shared/ui/time-input";
import {
  getEffectiveWeekStart,
  getOrderedWorkdays,
  WEEK_START_OPTIONS,
  type SchedulePhase,
  type WeekStartPreference,
} from "@/core/preferences/schedule-form";
import { getSegmentedControlClassName } from "@/shared/utils/control-styles";
import { useI18n } from "@/core/runtime/i18n";
import { cn, getSupportedTimezones, getWeekStartForTimezone } from "@/shared/utils/utils";

import type { ScheduleInput } from "@/shared/types/dashboard";

interface SetupSchedulePageProps {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  weekStart: WeekStartPreference;
  netHours: string;
  schedulePhase: SchedulePhase;
  onBack: () => void;
  onNext: () => void;
  onShiftStartChange: (v: string) => void;
  onShiftEndChange: (v: string) => void;
  onLunchMinutesChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onWeekStartChange: (value: WeekStartPreference) => void;
  onToggleWorkday: (day: string) => void;
  onSave: (input: ScheduleInput) => Promise<void>;
}

export function SetupSchedulePage({
  shiftStart,
  shiftEnd,
  lunchMinutes,
  workdays,
  timezone,
  weekStart,
  netHours,
  schedulePhase,
  onBack,
  onNext,
  onShiftStartChange,
  onShiftEndChange,
  onLunchMinutesChange,
  onTimezoneChange,
  onWeekStartChange,
  onToggleWorkday,
  onSave,
}: Readonly<SetupSchedulePageProps>) {
  const { formatWeekdayFromCode, t } = useI18n();
  const saving = schedulePhase === "saving";
  const [timezoneOpen, setTimezoneOpen] = React.useState(false);
  const [timezoneQuery, setTimezoneQuery] = React.useState("");
  const timezones = React.useMemo(() => getSupportedTimezones(timezone), [timezone]);
  const filteredTimezones = timezoneQuery
    ? timezones.filter((value: string) => value.toLowerCase().includes(timezoneQuery.toLowerCase()))
    : timezones;
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);

  async function handleSaveAndContinue() {
    const didSave = await persistScheduleStep({
      shiftStart,
      shiftEnd,
      lunchMinutes,
      workdays,
      timezone,
      resolvedWeekStart,
      onSave,
    });

    if (didSave) {
      onNext();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">{t("setup.scheduleTitle")}</h1>
        <p className="text-muted-foreground">{t("setup.scheduleDescription")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36 space-y-1.5">
          <Label htmlFor="shift-start">{t("settings.shiftStart")}</Label>
          <TimeInput
            id="shift-start"
            aria-label={t("settings.shiftStart")}
            value={shiftStart}
            onChange={onShiftStartChange}
          />
        </div>
        <div className="w-36 space-y-1.5">
          <Label htmlFor="shift-end">{t("settings.shiftEnd")}</Label>
          <TimeInput
            id="shift-end"
            aria-label={t("settings.shiftEnd")}
            value={shiftEnd}
            onChange={onShiftEndChange}
          />
        </div>
        <div className="w-36 space-y-1.5">
          <Label htmlFor="lunch-break" className="whitespace-nowrap">
            {t("settings.lunchBreak")}
          </Label>
          <Input
            id="lunch-break"
            type="number"
            min={0}
            step={5}
            value={lunchMinutes}
            onChange={(e) => onLunchMinutesChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">{t("settings.netHoursPerDay")}</Label>
          <div className="flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4">
            <span className="font-display text-sm font-bold text-primary tabular-nums">
              {netHours}h
            </span>
          </div>
        </div>
      </div>

      <div className="w-fit max-w-full space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          {t("settings.timezone")}
        </Label>
        <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 max-w-120 min-w-72 items-center justify-between gap-3 rounded-xl border-2 border-border-subtle bg-field px-3 py-2 text-left text-sm text-foreground shadow-clay-inset transition outline-none hover:border-border-strong hover:bg-field-hover focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <span className="truncate">{timezone}</span>
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-3rem)] overflow-hidden border-border-strong bg-popover p-0 text-card-foreground shadow-clay-popup"
          >
            <div className="border-b border-border-subtle p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={timezoneQuery}
                  onChange={(event) => setTimezoneQuery(event.target.value)}
                  placeholder={t("common.searchTimezone")}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="h-72">
              <div className="grid gap-1 bg-popover p-2">
                {filteredTimezones.map((option: string) => {
                  const active = option === timezone;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onTimezoneChange(option);
                        setTimezoneOpen(false);
                        setTimezoneQuery("");
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all",
                        active
                          ? "bg-primary/12 text-foreground shadow-clay"
                          : "text-muted-foreground hover:bg-field-hover hover:text-foreground",
                      )}
                    >
                      <span className="truncate">{option}</span>
                      <span className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                        {option.split("/")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>{t("settings.firstDayOfWeek")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEEK_START_OPTIONS.map((option) => {
            const active = weekStart === option;
            const autoLabel = getWeekStartForTimezone(timezone);
            const labelMap: Record<Exclude<WeekStartPreference, "auto">, string> = {
              sunday: "Sun",
              monday: "Mon",
              friday: "Fri",
              saturday: "Sat",
            };
            const label =
              option === "auto"
                ? `${t("common.auto")} (${formatWeekdayFromCode(
                    labelMap[autoLabel] as "Sun" | "Mon" | "Fri" | "Sat",
                  )})`
                : formatWeekdayFromCode(labelMap[option] as "Sun" | "Mon" | "Fri" | "Sat");

            return (
              <button
                key={option}
                type="button"
                onClick={() => onWeekStartChange(option)}
                className={getSegmentedControlClassName(
                  active,
                  "px-4 text-xs uppercase tracking-[0.14em]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("settings.workdays")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {orderedWorkdays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onToggleWorkday(day)}
              className={getSegmentedControlClassName(workdays.includes(day), "min-w-14")}
            >
              {formatWeekdayFromCode(day)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button onClick={() => void handleSaveAndContinue()} disabled={saving} className="w-full">
          {saving ? t("common.syncing") : t("common.saveAndContinue")}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}

async function persistScheduleStep({
  shiftStart,
  shiftEnd,
  lunchMinutes,
  workdays,
  timezone,
  resolvedWeekStart,
  onSave,
}: {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  resolvedWeekStart: Exclude<WeekStartPreference, "auto">;
  onSave: (input: ScheduleInput) => Promise<void>;
}) {
  const input: ScheduleInput = {
    shiftStart,
    shiftEnd,
    lunchMinutes: Number.parseInt(lunchMinutes) || 0,
    workdays,
    timezone,
    weekStart: resolvedWeekStart,
  };

  try {
    await onSave(input);
    return true;
  } catch {
    return false;
  }
}
