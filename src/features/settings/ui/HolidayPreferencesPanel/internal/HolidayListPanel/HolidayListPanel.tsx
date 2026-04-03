import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";

import type { HolidayListItem } from "@/shared/types/dashboard";
import type { useI18n } from "@/app/providers/I18nService/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

interface HolidayListPanelProps {
  currentHolidays: HolidayListItem[];
  currentYear: number;
  formatMonthDayWeekday: (date: Date) => string;
  isLoadingCurrentYear: boolean;
  onFocusHoliday: (holiday: HolidayListItem) => void;
  onYearChange: (year: number) => void;
  selectedDateKey: string | null;
  selectedYear: number;
  t: Translate;
}

export function HolidayListPanel({
  currentHolidays,
  currentYear,
  formatMonthDayWeekday,
  isLoadingCurrentYear,
  onFocusHoliday,
  onYearChange,
  selectedDateKey,
  selectedYear,
  t,
}: Readonly<HolidayListPanelProps>) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-border-subtle bg-panel shadow-card">
      <div className="flex shrink-0 items-center justify-between border-b-2 border-border-subtle px-3 py-2">
        <span className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
          {t("settings.holidays")}
        </span>
        <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border-subtle bg-tray p-1 shadow-clay">
          <button
            type="button"
            disabled={selectedYear <= 2016}
            onClick={() => onYearChange(selectedYear - 1)}
            className={getCompactIconButtonClassName(
              false,
              "rounded-lg border-transparent bg-transparent shadow-none hover:border-border-subtle hover:bg-field-hover disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onYearChange(currentYear)}
            className={getNeutralSegmentedControlClassName(
              false,
              "rounded-lg border-transparent bg-transparent px-2 hover:bg-field-hover",
            )}
          >
            {selectedYear === currentYear ? t("common.thisYear") : selectedYear}
          </button>
          <button
            type="button"
            disabled={selectedYear >= 2031}
            onClick={() => onYearChange(selectedYear + 1)}
            className={getCompactIconButtonClassName(
              false,
              "rounded-lg border-transparent bg-transparent shadow-none hover:border-border-subtle hover:bg-field-hover disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-panel/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-panel/95 to-transparent" />

        <div className="absolute inset-0 overflow-y-auto overscroll-contain scroll-smooth p-2">
          {isLoadingCurrentYear ? (
            <div className="grid min-h-40 place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : currentHolidays.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-border-subtle bg-panel-elevated px-6 text-center text-sm text-muted-foreground">
              {t("settings.noHolidaysForYear", { year: selectedYear })}
            </div>
          ) : (
            <div className="grid gap-2">
              {currentHolidays.map((holiday) => {
                const active = selectedDateKey === holiday.date;
                return (
                  <button
                    key={`${holiday.date}-${holiday.name}`}
                    type="button"
                    onClick={() => onFocusHoliday(holiday)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-all",
                      active
                        ? "border-primary/30 bg-primary/10 text-foreground shadow-clay"
                        : "border-border-subtle bg-panel-elevated text-foreground shadow-card hover:bg-panel",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{holiday.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatMonthDayWeekday(new Date(`${holiday.date}T12:00:00`))}
                      </p>
                    </div>
                    <span className="rounded-xl border-2 border-warning/70 bg-warning/10 px-2 py-1 text-[11px] font-bold tracking-[0.18em] text-warning uppercase shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_55%,var(--color-border))]">
                      {holiday.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
