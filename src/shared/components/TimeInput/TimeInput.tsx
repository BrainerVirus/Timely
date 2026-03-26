import { useMemo, useRef, useState } from "react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { inputVariants } from "@/shared/components/Input/Input";
import { cn } from "@/shared/utils/utils";

import type * as React from "react";

type TimeCycle = "system" | "12h" | "24h";
type ResolvedTimeCycle = Exclude<TimeCycle, "system">;
type Segment = "hour" | "minute" | "period";

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

interface TimeParts {
  hours24: number;
  minutes: number;
}

interface DisplayParts {
  hour: string;
  minute: string;
  period: "AM" | "PM";
}

interface DayPeriodLabels {
  am: string;
  pm: string;
}

type DraftValue = {
  sourceValue: string;
  text: string;
};

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
  const resolvedTimeCycle = useMemo(() => resolveTimeCycle(timeCycle), [timeCycle]);
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

interface UseTimeInputControllerArgs {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  resolvedTimeCycle: ResolvedTimeCycle;
  dayPeriodLabels: DayPeriodLabels;
  timeParts: TimeParts;
  displayParts: DisplayParts;
}

function useTimeInputController({
  value,
  onChange,
  disabled,
  resolvedTimeCycle,
  dayPeriodLabels,
  timeParts,
  displayParts,
}: UseTimeInputControllerArgs) {
  const hourRef = useRef<HTMLButtonElement>(null);
  const minuteRef = useRef<HTMLButtonElement>(null);
  const periodRef = useRef<HTMLButtonElement>(null);
  const [hourDraft, setHourDraft] = useState<DraftValue | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<DraftValue | null>(null);

  const currentHourDraft = getCurrentDraft(hourDraft, value);
  const currentMinuteDraft = getCurrentDraft(minuteDraft, value);
  const renderedHour = currentHourDraft ?? displayParts.hour;
  const renderedMinute = currentMinuteDraft ?? displayParts.minute;

  function focusSegment(segment: Segment) {
    if (segment === "hour") {
      hourRef.current?.focus();
      return;
    }

    if (segment === "minute") {
      minuteRef.current?.focus();
      return;
    }

    periodRef.current?.focus();
  }

  function emitTime(nextParts: TimeParts) {
    onChange(formatTimeValue(nextParts));
  }

  function commitHour(rawValue: string, moveToNext = false) {
    const digits = normalizeDigits(rawValue);
    if (!digits) {
      setHourDraft(null);
      return;
    }

    const parsed = Number.parseInt(digits, 10);
    if (Number.isNaN(parsed)) {
      setHourDraft(null);
      return;
    }

    const nextHours24 =
      resolvedTimeCycle === "12h"
        ? to24Hour(clampHour12(parsed), displayParts.period)
        : clamp(parsed, 0, 23);

    setHourDraft(null);
    emitTime({ hours24: nextHours24, minutes: timeParts.minutes });

    if (moveToNext) {
      queueMicrotask(() => focusSegment("minute"));
    }
  }

  function commitMinute(rawValue: string, moveToNext = false) {
    const digits = normalizeDigits(rawValue);
    if (!digits) {
      setMinuteDraft(null);
      return;
    }

    const parsed = Number.parseInt(digits, 10);
    if (Number.isNaN(parsed)) {
      setMinuteDraft(null);
      return;
    }

    setMinuteDraft(null);
    emitTime({ hours24: timeParts.hours24, minutes: clamp(parsed, 0, 59) });

    if (moveToNext && resolvedTimeCycle === "12h") {
      queueMicrotask(() => focusSegment("period"));
    }
  }

  function commitPeriod(nextPeriod: "AM" | "PM") {
    if (resolvedTimeCycle !== "12h" || nextPeriod === displayParts.period) {
      return;
    }

    emitTime({
      hours24: (timeParts.hours24 + 12) % 24,
      minutes: timeParts.minutes,
    });
  }

  function appendDigit(segment: Extract<Segment, "hour" | "minute">, digit: string) {
    if (segment === "hour") {
      const nextDigits = normalizeDigits(`${currentHourDraft ?? ""}${digit}`);
      setHourDraft(toDraftValue(nextDigits, value));

      if (shouldAutoAdvanceHour(nextDigits, resolvedTimeCycle)) {
        commitHour(nextDigits, true);
      }

      return;
    }

    const nextDigits = normalizeDigits(`${currentMinuteDraft ?? ""}${digit}`);
    setMinuteDraft(toDraftValue(nextDigits, value));

    if (shouldAutoAdvanceMinute(nextDigits)) {
      commitMinute(nextDigits, true);
    }
  }

  function removeLastDigit(segment: Extract<Segment, "hour" | "minute">) {
    if (segment === "hour") {
      const nextDigits = (currentHourDraft ?? "").slice(0, -1);
      setHourDraft(toDraftValue(nextDigits, value));
      return;
    }

    const nextDigits = (currentMinuteDraft ?? "").slice(0, -1);
    setMinuteDraft(toDraftValue(nextDigits, value));
  }

  function handleHourBlur() {
    if (currentHourDraft) {
      commitHour(currentHourDraft);
      return;
    }

    setHourDraft(null);
  }

  function handleMinuteBlur() {
    if (currentMinuteDraft) {
      commitMinute(currentMinuteDraft);
      return;
    }

    setMinuteDraft(null);
  }

  function handleDigitKey(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (segment !== "period" && /^\d$/.test(event.key)) {
      event.preventDefault();
      appendDigit(segment, event.key);
      return true;
    }

    return false;
  }

  function handleBackspaceKey(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (segment !== "period" && event.key === "Backspace") {
      event.preventDefault();
      removeLastDigit(segment);
      return true;
    }

    return false;
  }

  function handleArrowRightKey(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight") {
      return false;
    }

    event.preventDefault();

    if (segment === "hour") {
      focusSegment("minute");
    } else if (segment === "minute" && resolvedTimeCycle === "12h") {
      focusSegment("period");
    }

    return true;
  }

  function handleArrowLeftKey(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft") {
      return false;
    }

    event.preventDefault();
    focusSegment(segment === "period" ? "minute" : "hour");
    return true;
  }

  function handleArrowVerticalKey(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return false;
    }

    event.preventDefault();
    const delta = event.key === "ArrowUp" ? 1 : -1;

    if (segment === "hour") {
      if (resolvedTimeCycle === "12h") {
        const nextHour12 = wrap((timeParts.hours24 % 12 || 12) + delta, 1, 12);
        emitTime({
          hours24: to24Hour(nextHour12, displayParts.period),
          minutes: timeParts.minutes,
        });
      } else {
        emitTime({
          hours24: wrap(timeParts.hours24 + delta, 0, 23),
          minutes: timeParts.minutes,
        });
      }
    } else if (segment === "minute") {
      emitTime({
        hours24: timeParts.hours24,
        minutes: wrap(timeParts.minutes + delta, 0, 59),
      });
    } else {
      commitPeriod(displayParts.period === "AM" ? "PM" : "AM");
    }

    return true;
  }

  function handlePeriodKey(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (segment !== "period" || event.key.length !== 1) {
      return false;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      commitPeriod(displayParts.period === "AM" ? "PM" : "AM");
      return true;
    }

    const nextPeriod = resolveTypedPeriod(event.key, dayPeriodLabels);
    if (nextPeriod) {
      event.preventDefault();
      commitPeriod(nextPeriod);
      return true;
    }

    return false;
  }

  function handleSegmentKeyDown(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (
      handleDigitKey(segment, event) ||
      handleBackspaceKey(segment, event) ||
      handleArrowRightKey(segment, event) ||
      handleArrowLeftKey(segment, event) ||
      handleArrowVerticalKey(segment, event) ||
      handlePeriodKey(segment, event)
    ) {
      return;
    }
  }

  function handleContainerMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    event.preventDefault();
    focusSegment("hour");
  }

  function handleSegmentMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.focus();
  }

  return {
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
  };
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

function resolveTimeCycle(timeCycle: TimeCycle): ResolvedTimeCycle {
  if (timeCycle !== "system") {
    return timeCycle;
  }

  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
  const { hour12, hourCycle } = formatter.resolvedOptions();

  if (typeof hour12 === "boolean") {
    return hour12 ? "12h" : "24h";
  }

  return hourCycle?.startsWith("h1") ? "12h" : "24h";
}

export function getResolvedTimeCycle(timeCycle: TimeCycle = "system") {
  return resolveTimeCycle(timeCycle);
}

function getDayPeriodLabels(): DayPeriodLabels {
  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", hour12: true });
  const am = formatter
    .formatToParts(new Date(2026, 0, 1, 9))
    .find((part) => part.type === "dayPeriod")?.value;
  const pm = formatter
    .formatToParts(new Date(2026, 0, 1, 21))
    .find((part) => part.type === "dayPeriod")?.value;

  return {
    am: am ?? "AM",
    pm: pm ?? "PM",
  };
}

function parseTimeValue(value: string): TimeParts {
  const [rawHours = "0", rawMinutes = "0"] = value.split(":");

  return {
    hours24: clamp(Number.parseInt(rawHours, 10) || 0, 0, 23),
    minutes: clamp(Number.parseInt(rawMinutes, 10) || 0, 0, 59),
  };
}

function formatTimeValue({ hours24, minutes }: TimeParts) {
  return `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDisplayParts(timeParts: TimeParts, resolvedTimeCycle: ResolvedTimeCycle): DisplayParts {
  if (resolvedTimeCycle === "24h") {
    return {
      hour: String(timeParts.hours24).padStart(2, "0"),
      minute: String(timeParts.minutes).padStart(2, "0"),
      period: "AM",
    };
  }

  const period = timeParts.hours24 >= 12 ? "PM" : "AM";
  const hour12 = timeParts.hours24 % 12 || 12;

  return {
    hour: String(hour12).padStart(2, "0"),
    minute: String(timeParts.minutes).padStart(2, "0"),
    period,
  };
}

function normalizeDigits(value: string) {
  return value.replaceAll(/\D/g, "").slice(0, 2);
}

function shouldAutoAdvanceHour(value: string, resolvedTimeCycle: ResolvedTimeCycle) {
  if (!value) {
    return false;
  }

  if (value.length >= 2) {
    return true;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return resolvedTimeCycle === "12h" ? parsed > 1 : parsed > 2;
}

function shouldAutoAdvanceMinute(value: string) {
  if (!value) {
    return false;
  }

  if (value.length >= 2) {
    return true;
  }

  const parsed = Number.parseInt(value, 10);
  return !Number.isNaN(parsed) && parsed > 5;
}

function clampHour12(value: number) {
  if (value <= 0) {
    return 12;
  }

  return clamp(value, 1, 12);
}

function to24Hour(hour12: number, period: "AM" | "PM") {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }

  return hour12 === 12 ? 12 : hour12 + 12;
}

function resolveTypedPeriod(value: string, labels: DayPeriodLabels): "AM" | "PM" | null {
  const normalizedValue = normalizeLabel(value);
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === "a") {
    return "AM";
  }

  if (normalizedValue === "p") {
    return "PM";
  }

  const am = normalizeLabel(labels.am);
  const pm = normalizeLabel(labels.pm);

  if (normalizedValue === am || normalizedValue === am[0]) {
    return "AM";
  }

  if (normalizedValue === pm || normalizedValue === pm[0]) {
    return "PM";
  }

  return null;
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function getCurrentDraft(draft: DraftValue | null, value: string) {
  return draft?.sourceValue === value ? draft.text : null;
}

function toDraftValue(text: string, value: string): DraftValue | null {
  return text ? { sourceValue: value, text } : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function wrap(value: number, min: number, max: number) {
  const range = max - min + 1;
  return ((((value - min) % range) + range) % range) + min;
}
