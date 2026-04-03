import { useState } from "react";
import {
  clampHour12,
  formatTimeValue,
  getCurrentDraft,
  normalizeDigits,
  shouldAutoAdvanceHour,
  shouldAutoAdvanceMinute,
  to24Hour,
  toDraftValue,
  wrap,
} from "@/shared/ui/TimeInput/internal/time-input-helpers";

import type {
  DisplayParts,
  DraftValue,
  ResolvedTimeCycle,
  Segment,
  TimeParts,
} from "@/shared/ui/TimeInput/internal/time-input.types";

interface UseTimeInputDraftsArgs {
  value: string;
  onChange: (value: string) => void;
  resolvedTimeCycle: ResolvedTimeCycle;
  timeParts: TimeParts;
  displayParts: DisplayParts;
  focusSegment: (segment: Segment) => void;
}

export function useTimeInputDrafts({
  value,
  onChange,
  resolvedTimeCycle,
  timeParts,
  displayParts,
  focusSegment,
}: UseTimeInputDraftsArgs) {
  const [hourDraft, setHourDraft] = useState<DraftValue | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<DraftValue | null>(null);

  const currentHourDraft = getCurrentDraft(hourDraft, value);
  const currentMinuteDraft = getCurrentDraft(minuteDraft, value);
  const renderedHour = currentHourDraft ?? displayParts.hour;
  const renderedMinute = currentMinuteDraft ?? displayParts.minute;

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
        : Math.min(Math.max(parsed, 0), 23);

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
    emitTime({ hours24: timeParts.hours24, minutes: Math.min(Math.max(parsed, 0), 59) });

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
      setHourDraft(toDraftValue((currentHourDraft ?? "").slice(0, -1), value));
      return;
    }

    setMinuteDraft(toDraftValue((currentMinuteDraft ?? "").slice(0, -1), value));
  }

  function stepSegment(segment: Segment, delta: 1 | -1) {
    if (segment === "hour") {
      if (resolvedTimeCycle === "12h") {
        const nextHour12 = wrap((timeParts.hours24 % 12 || 12) + delta, 1, 12);
        emitTime({
          hours24: to24Hour(nextHour12, displayParts.period),
          minutes: timeParts.minutes,
        });
        return;
      }

      emitTime({
        hours24: wrap(timeParts.hours24 + delta, 0, 23),
        minutes: timeParts.minutes,
      });
      return;
    }

    if (segment === "minute") {
      emitTime({
        hours24: timeParts.hours24,
        minutes: wrap(timeParts.minutes + delta, 0, 59),
      });
      return;
    }

    commitPeriod(displayParts.period === "AM" ? "PM" : "AM");
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

  return {
    renderedHour,
    renderedMinute,
    appendDigit,
    removeLastDigit,
    commitPeriod,
    stepSegment,
    handleHourBlur,
    handleMinuteBlur,
  };
}
