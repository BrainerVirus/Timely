import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { cn } from "@/shared/lib/utils";
import { inputVariants } from "@/shared/ui/Input/Input";
import {
  getDayPeriodLabels,
  getDisplayParts,
  getResolvedTimeCycle,
  parseTimeValue,
} from "@/shared/ui/TimeInput/internal/time-input-helpers";
import { useTimeInputController } from "@/shared/ui/TimeInput/internal/use-time-input-controller";

import type { TimeCycle } from "@/shared/ui/TimeInput/internal/time-input.types";
import type * as React from "react";

interface TimeInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  timeCycle?: TimeCycle;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function TimeInput({
  id,
  name,
  value,
  onChange,
  className,
  disabled = false,
  timeCycle = "system",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: Readonly<TimeInputProps>) {
  const { t } = useI18n();
  const resolvedTimeCycle = useMemo(() => getResolvedTimeCycle(timeCycle), [timeCycle]);
  const dayPeriodLabels = useMemo(() => getDayPeriodLabels(), []);
  const timeParts = useMemo(() => parseTimeValue(value), [value]);
  const displayParts = useMemo(
    () => getDisplayParts(timeParts, resolvedTimeCycle),
    [resolvedTimeCycle, timeParts],
  );
  const {
    hourRef,
    minuteRef,
    periodRef,
    renderedHour,
    renderedMinute,
    handleContainerMouseDown,
    handleSegmentMouseDown,
    handleHourBlur,
    handleMinuteBlur,
    handleSegmentKeyDown,
  } = useTimeInputController({
    value,
    onChange,
    disabled,
    resolvedTimeCycle,
    dayPeriodLabels,
    timeParts,
    displayParts,
  });

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        inputVariants(),
        "group flex items-center gap-1 overflow-hidden px-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onMouseDown={handleContainerMouseDown}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <SegmentButton
        ref={hourRef}
        id={id}
        aria-label={t("timeInput.hours")}
        className="w-8"
        disabled={disabled}
        onMouseDown={handleSegmentMouseDown}
        onBlur={handleHourBlur}
        onKeyDown={(event) => handleSegmentKeyDown("hour", event)}
      >
        {renderedHour}
      </SegmentButton>
      <span className="text-foreground/80 select-none">:</span>
      <SegmentButton
        ref={minuteRef}
        aria-label={t("timeInput.minutes")}
        className="w-8"
        disabled={disabled}
        onMouseDown={handleSegmentMouseDown}
        onBlur={handleMinuteBlur}
        onKeyDown={(event) => handleSegmentKeyDown("minute", event)}
      >
        {renderedMinute}
      </SegmentButton>
      {resolvedTimeCycle === "12h" ? (
        <>
          <span className="w-1" aria-hidden="true" />
          <SegmentButton
            ref={periodRef}
            aria-label={t("timeInput.period")}
            className="min-w-10 whitespace-nowrap uppercase"
            disabled={disabled}
            onMouseDown={handleSegmentMouseDown}
            onKeyDown={(event) => handleSegmentKeyDown("period", event)}
          >
            {displayParts.period === "AM" ? dayPeriodLabels.am : dayPeriodLabels.pm}
          </SegmentButton>
        </>
      ) : null}
    </div>
  );
}

const segmentButtonClassName =
  "inline-flex h-6 shrink-0 items-center justify-center rounded-md px-1 text-sm leading-none tabular-nums text-foreground outline-none transition focus:bg-primary focus:text-primary-foreground active:bg-primary active:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";

const SegmentButton = ({ className, ref, children, ...props }: React.ComponentProps<"button">) => {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="time-segment"
      className={cn(segmentButtonClassName, className)}
      {...props}
    >
      {children}
    </button>
  );
};

export { getResolvedTimeCycle };
