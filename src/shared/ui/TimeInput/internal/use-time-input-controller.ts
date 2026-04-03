import { useRef } from "react";
import { handleTimeInputSegmentKeyDown } from "@/shared/ui/TimeInput/internal/time-input-keyboard";
import { useTimeInputDrafts } from "@/shared/ui/TimeInput/internal/use-time-input-drafts";

import type {
  DayPeriodLabels,
  DisplayParts,
  ResolvedTimeCycle,
  Segment,
  TimeParts,
} from "@/shared/ui/TimeInput/internal/time-input.types";
import type * as React from "react";

interface UseTimeInputControllerArgs {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  resolvedTimeCycle: ResolvedTimeCycle;
  dayPeriodLabels: DayPeriodLabels;
  timeParts: TimeParts;
  displayParts: DisplayParts;
}

export function useTimeInputController({
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

  const {
    renderedHour,
    renderedMinute,
    appendDigit,
    removeLastDigit,
    commitPeriod,
    stepSegment,
    handleHourBlur,
    handleMinuteBlur,
  } = useTimeInputDrafts({
    value,
    onChange,
    resolvedTimeCycle,
    timeParts,
    displayParts,
    focusSegment,
  });

  function handleSegmentKeyDown(segment: Segment, event: React.KeyboardEvent<HTMLButtonElement>) {
    handleTimeInputSegmentKeyDown({
      segment,
      event,
      disabled,
      resolvedTimeCycle,
      dayPeriodLabels,
      displayParts,
      focusSegment,
      appendDigit,
      removeLastDigit,
      commitPeriod,
      stepSegment,
    });
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
