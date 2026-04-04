import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import { getCompactIconButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { Calendar, type CalendarLabels } from "@/shared/ui/Calendar/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/Popover/Popover";

import type { CalendarWeekStartsOn } from "@/shared/ui/SingleDayPicker/SingleDayPicker";
import type { DateRange } from "react-day-picker";

export interface PeriodRange {
  from: Date;
  to: Date;
}

interface PeriodPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: PeriodRange;
  draftRange: DateRange | undefined;
  visibleMonth: Date;
  onDraftRangeChange: (range: DateRange | undefined) => void;
  onVisibleMonthChange: (month: Date) => void;
  onSelectRange: (range: PeriodRange) => void;
  holidays: Array<{ date: Date; label: string }>;
  weekStartsOn: CalendarWeekStartsOn;
  /** Aria-label for the trigger button. E.g. t("common.pickPeriod"). */
  pickPeriodAriaLabel?: string;
  /** Calendar labels and locale. When omitted, uses default English. */
  calendarLabels?: CalendarLabels;
  /** Locale for Calendar. E.g. "en", "es", "pt". */
  locale?: string;
}

export function PeriodPicker({
  open,
  onOpenChange,
  range,
  draftRange,
  visibleMonth,
  onDraftRangeChange,
  onVisibleMonthChange,
  onSelectRange,
  holidays,
  weekStartsOn,
  pickPeriodAriaLabel = "Pick period",
  calendarLabels,
  locale,
}: Readonly<PeriodPickerProps>) {
  const selectedRange = draftRange ?? { from: range.from, to: range.to };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={pickPeriodAriaLabel}
          className={getCompactIconButtonClassName(open)}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-158 p-0" align="end">
        <Calendar
          mode="range"
          selected={selectedRange}
          resetOnSelect
          locale={locale}
          labels={calendarLabels}
          onSelect={(nextRange: DateRange | undefined) => {
            if (!nextRange?.from) {
              onDraftRangeChange(undefined);
              return;
            }

            if (!nextRange.to) {
              onDraftRangeChange({ from: nextRange.from, to: undefined });
              return;
            }

            const normalizedRange =
              nextRange.from <= nextRange.to
                ? { from: nextRange.from, to: nextRange.to }
                : { from: nextRange.to, to: nextRange.from };
            onDraftRangeChange(normalizedRange);
            onSelectRange(normalizedRange);
          }}
          month={visibleMonth}
          onMonthChange={onVisibleMonthChange}
          weekStartsOn={weekStartsOn}
          numberOfMonths={2}
          className="border-0 p-3"
          holidays={holidays}
        />
      </PopoverContent>
    </Popover>
  );
}
