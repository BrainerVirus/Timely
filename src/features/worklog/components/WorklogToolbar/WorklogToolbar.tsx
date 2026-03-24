import { useI18n } from "@/core/services/I18nService/i18n";
import { PagerControl } from "@/shared/components/PagerControl/PagerControl";
import { PeriodPicker } from "@/shared/components/PeriodPicker/PeriodPicker";
import {
  type CalendarWeekStartsOn,
  SingleDayPicker,
} from "@/shared/components/SingleDayPicker/SingleDayPicker";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/Tabs/Tabs";
import { shiftDate } from "@/shared/utils/date";

import type { PeriodRangeState } from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import type { WorklogMode } from "@/shared/types/dashboard";
import type { DateRange } from "react-day-picker";

interface WorklogToolbarProps {
  activeDate: Date;
  calendarHolidays: Array<{ date: Date; label: string }>;
  calendarWeekStartsOn: CalendarWeekStartsOn;
  currentWeekRange: string;
  dayCalendarOpen: boolean;
  dayVisibleMonth: Date;
  displayMode: "day" | "week" | "period";
  isCurrentDay: boolean;
  isCurrentPeriod: boolean;
  isCurrentWeek: boolean;
  onDayCalendarOpenChange: (open: boolean) => void;
  onDaySelectDate: (date: Date) => void;
  onDayVisibleMonthChange: (month: Date) => void;
  onModeChange: (mode: WorklogMode) => void;
  periodCalendarOpen: boolean;
  onPeriodCalendarOpenChange: (open: boolean) => void;
  onPeriodDraftRangeChange: (range: DateRange | undefined) => void;
  onPeriodSelectRange: (range: PeriodRangeState) => void;
  onPeriodVisibleMonthChange: (month: Date) => void;
  onResetCurrentPeriod: () => void;
  onShiftCurrentPeriod: (days: number) => void;
  onWeekCalendarOpenChange: (open: boolean) => void;
  onWeekSelectDate: (date: Date) => void;
  onWeekVisibleMonthChange: (month: Date) => void;
  periodDraftRange: DateRange | undefined;
  periodLabel: string;
  periodRange: PeriodRangeState;
  periodRangeDays: number;
  periodVisibleMonth: Date;
  weekCalendarOpen: boolean;
  weekVisibleMonth: Date;
}

export function WorklogToolbar({
  activeDate,
  calendarHolidays,
  calendarWeekStartsOn,
  currentWeekRange,
  dayCalendarOpen,
  dayVisibleMonth,
  displayMode,
  isCurrentDay,
  isCurrentPeriod,
  isCurrentWeek,
  onDayCalendarOpenChange,
  onDaySelectDate,
  onDayVisibleMonthChange,
  onModeChange,
  periodCalendarOpen,
  onPeriodCalendarOpenChange,
  onPeriodDraftRangeChange,
  onPeriodSelectRange,
  onPeriodVisibleMonthChange,
  onResetCurrentPeriod,
  onShiftCurrentPeriod,
  onWeekCalendarOpenChange,
  onWeekSelectDate,
  onWeekVisibleMonthChange,
  periodDraftRange,
  periodLabel,
  periodRange,
  periodRangeDays,
  periodVisibleMonth,
  weekCalendarOpen,
  weekVisibleMonth,
}: Readonly<WorklogToolbarProps>) {
  const { formatDateShort, t } = useI18n();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <Tabs value={displayMode} onValueChange={(value) => onModeChange(value as WorklogMode)}>
        <TabsList data-onboarding="worklog-tabs">
          <TabsTrigger value="day">{t("common.day")}</TabsTrigger>
          <TabsTrigger value="week">{t("common.week")}</TabsTrigger>
          <TabsTrigger value="period">{t("common.period")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        {displayMode === "day" ? (
          <>
            <PagerControl
              label={isCurrentDay ? t("common.today") : formatDateShort(activeDate)}
              scopeLabel={t("common.day")}
              onPrevious={() => onDaySelectDate(shiftDate(activeDate, -1))}
              onCurrent={() => onDaySelectDate(new Date())}
              onNext={() => onDaySelectDate(shiftDate(activeDate, 1))}
            />
            <SingleDayPicker
              open={dayCalendarOpen}
              onOpenChange={onDayCalendarOpenChange}
              selectedDate={activeDate}
              visibleMonth={dayVisibleMonth}
              onSelectDate={onDaySelectDate}
              onVisibleMonthChange={onDayVisibleMonthChange}
              buttonLabel={t("common.pickDay")}
              holidays={calendarHolidays}
              weekStartsOn={calendarWeekStartsOn}
            />
          </>
        ) : null}

        {displayMode === "week" ? (
          <>
            <PagerControl
              label={isCurrentWeek ? t("common.thisWeek") : currentWeekRange}
              scopeLabel={t("common.week")}
              onPrevious={() => onWeekSelectDate(shiftDate(activeDate, -7))}
              onCurrent={() => onWeekSelectDate(new Date())}
              onNext={() => onWeekSelectDate(shiftDate(activeDate, 7))}
            />
            <SingleDayPicker
              open={weekCalendarOpen}
              onOpenChange={onWeekCalendarOpenChange}
              selectedDate={activeDate}
              visibleMonth={weekVisibleMonth}
              onSelectDate={onWeekSelectDate}
              onVisibleMonthChange={onWeekVisibleMonthChange}
              buttonLabel={t("common.pickWeek")}
              holidays={calendarHolidays}
              weekStartsOn={calendarWeekStartsOn}
            />
          </>
        ) : null}

        {displayMode === "period" ? (
          <>
            <PagerControl
              label={isCurrentPeriod ? t("common.thisPeriod") : periodLabel}
              scopeLabel={t("common.period")}
              onPrevious={() => onShiftCurrentPeriod(-periodRangeDays)}
              onCurrent={onResetCurrentPeriod}
              onNext={() => onShiftCurrentPeriod(periodRangeDays)}
            />
            <PeriodPicker
              open={periodCalendarOpen}
              onOpenChange={onPeriodCalendarOpenChange}
              range={periodRange}
              draftRange={periodDraftRange}
              visibleMonth={periodVisibleMonth}
              onDraftRangeChange={onPeriodDraftRangeChange}
              onVisibleMonthChange={onPeriodVisibleMonthChange}
              onSelectRange={onPeriodSelectRange}
              holidays={calendarHolidays}
              weekStartsOn={calendarWeekStartsOn}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
