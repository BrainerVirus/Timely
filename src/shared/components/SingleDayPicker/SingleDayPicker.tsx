import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import { Calendar } from "@/shared/components/Calendar/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/Popover/Popover";
import { getCompactIconButtonClassName } from "@/shared/utils/control-styles";

export type CalendarWeekStartsOn = 0 | 1 | 5 | 6;

interface SingleDayPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  visibleMonth: Date;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange: (month: Date) => void;
  buttonLabel: string;
  holidays: Array<{ date: Date; label: string }>;
  weekStartsOn: CalendarWeekStartsOn;
}

export function SingleDayPicker({
  open,
  onOpenChange,
  selectedDate,
  visibleMonth,
  onSelectDate,
  onVisibleMonthChange,
  buttonLabel,
  holidays,
  weekStartsOn,
}: Readonly<SingleDayPickerProps>) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={buttonLabel}
          className={getCompactIconButtonClassName(open)}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-78 p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(value: Date | undefined) => {
            if (!value) return;
            onSelectDate(value);
            onOpenChange(false);
          }}
          month={visibleMonth}
          onMonthChange={onVisibleMonthChange}
          weekStartsOn={weekStartsOn}
          className="border-0 p-3"
          holidays={holidays}
        />
      </PopoverContent>
    </Popover>
  );
}
