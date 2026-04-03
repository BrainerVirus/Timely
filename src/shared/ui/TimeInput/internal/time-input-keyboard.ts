import { resolveTypedPeriod } from "@/shared/ui/TimeInput/internal/time-input-helpers";

import type {
  DayPeriodLabels,
  DisplayParts,
  ResolvedTimeCycle,
  Segment,
} from "@/shared/ui/TimeInput/internal/time-input.types";
import type * as React from "react";

interface HandleTimeInputSegmentKeyDownArgs {
  segment: Segment;
  event: React.KeyboardEvent<HTMLButtonElement>;
  disabled: boolean;
  resolvedTimeCycle: ResolvedTimeCycle;
  dayPeriodLabels: DayPeriodLabels;
  displayParts: DisplayParts;
  focusSegment: (segment: Segment) => void;
  appendDigit: (segment: Extract<Segment, "hour" | "minute">, digit: string) => void;
  removeLastDigit: (segment: Extract<Segment, "hour" | "minute">) => void;
  commitPeriod: (nextPeriod: "AM" | "PM") => void;
  stepSegment: (segment: Segment, delta: 1 | -1) => void;
}

export function handleTimeInputSegmentKeyDown({
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
}: HandleTimeInputSegmentKeyDownArgs) {
  if (disabled) {
    return;
  }

  if (segment !== "period" && /^\d$/.test(event.key)) {
    event.preventDefault();
    appendDigit(segment, event.key);
    return;
  }

  if (segment !== "period" && event.key === "Backspace") {
    event.preventDefault();
    removeLastDigit(segment);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();

    if (segment === "hour") {
      focusSegment("minute");
    } else if (segment === "minute" && resolvedTimeCycle === "12h") {
      focusSegment("period");
    }

    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    focusSegment(segment === "period" ? "minute" : "hour");
    return;
  }

  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    stepSegment(segment, event.key === "ArrowUp" ? 1 : -1);
    return;
  }

  if (segment !== "period" || event.key.length !== 1) {
    return;
  }

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    commitPeriod(displayParts.period === "AM" ? "PM" : "AM");
    return;
  }

  const nextPeriod = resolveTypedPeriod(event.key, dayPeriodLabels);
  if (!nextPeriod) {
    return;
  }

  event.preventDefault();
  commitPeriod(nextPeriod);
}
