import * as React from "react";
import {
  DAY_COLUMN_MIN_WIDTH,
  HEADER_HEIGHT,
  getInitialScheduleScrollTop,
  getInitialSelectedDay,
} from "@/domains/schedule/ui/ScheduleWorkspace/lib/schedule-workspace-helpers";
import { WEEKDAY_ORDER } from "@/shared/lib/utils";

import type { SchedulePatternGroup } from "@/domains/schedule/lib/schedule-visualization";
import type {
  WeekdayCode,
  WeekdayScheduleFormRow,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import type { ScheduleWorkspaceProps } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";

interface UseScheduleWorkspaceControllerOptions {
  weekdaySchedules: WeekdayScheduleFormRow[];
  orderedWorkdays: readonly WeekdayCode[];
  scheduleByDay: Map<WeekdayCode, WeekdayScheduleFormRow>;
  patternGroups: SchedulePatternGroup[];
  axisStartMinutes: number;
  onCopyWeekdaySchedule: ScheduleWorkspaceProps["onCopyWeekdaySchedule"];
}

export function useScheduleWorkspaceController({
  weekdaySchedules,
  orderedWorkdays,
  scheduleByDay,
  patternGroups,
  axisStartMinutes,
  onCopyWeekdaySchedule,
}: Readonly<UseScheduleWorkspaceControllerOptions>) {
  const editorCardReference = React.useRef<HTMLDivElement | null>(null);
  const dayBodyViewportReference = React.useRef<HTMLDivElement | null>(null);
  const dayHeaderTrackReference = React.useRef<HTMLDivElement | null>(null);
  const timeRailReference = React.useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledReference = React.useRef(false);
  const [selectedDay, setSelectedDay] = React.useState<WeekdayCode>(
    getInitialSelectedDay(weekdaySchedules, orderedWorkdays),
  );
  const [selectedApplyDays, setSelectedApplyDays] = React.useState<WeekdayCode[]>([]);
  const [calendarViewportHeight, setCalendarViewportHeight] = React.useState<number | null>(null);
  const selectedSchedule =
    scheduleByDay.get(selectedDay) ?? scheduleByDay.get(orderedWorkdays[0] ?? "Mon");
  const selectedGroup =
    patternGroups.find((group) => group.days.includes(selectedDay)) ??
    (selectedSchedule
      ? {
          signature: "",
          days: [selectedDay],
          schedule: selectedSchedule,
        }
      : undefined);
  const matchingDays = selectedGroup?.days.filter((day) => day !== selectedDay) ?? [];
  const selectedGroupDaysKey = selectedGroup?.days.join("|") ?? "";
  const minCalendarTrackWidth = orderedWorkdays.length * DAY_COLUMN_MIN_WIDTH;
  const [calendarTrackWidth, setCalendarTrackWidth] = React.useState(minCalendarTrackWidth);
  const [dayBodyViewportClientHeight, setDayBodyViewportClientHeight] = React.useState<
    number | null
  >(null);
  const viewportHeight = calendarViewportHeight ?? 544;
  const bodyViewportHeight = Math.max(viewportHeight - HEADER_HEIGHT, 240);
  const timeRailViewportHeight = dayBodyViewportClientHeight ?? bodyViewportHeight;

  React.useEffect(() => {
    const hasSelectedDay = weekdaySchedules.some((schedule) => schedule.day === selectedDay);
    const nextSelectedDay = hasSelectedDay
      ? selectedDay
      : getInitialSelectedDay(weekdaySchedules, orderedWorkdays);

    if (nextSelectedDay !== selectedDay) {
      setSelectedDay(nextSelectedDay);
    }
  }, [orderedWorkdays, selectedDay, weekdaySchedules]);

  React.useEffect(() => {
    setSelectedApplyDays(
      selectedGroupDaysKey
        .split("|")
        .filter(
          (day): day is WeekdayCode =>
            day !== selectedDay && WEEKDAY_ORDER.includes(day as WeekdayCode),
        ),
    );
  }, [selectedDay, selectedGroupDaysKey]);

  React.useLayoutEffect(() => {
    const element = editorCardReference.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setCalendarViewportHeight(Math.ceil(element.getBoundingClientRect().height));
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedApplyDays.length, selectedDay, selectedSchedule?.enabled]);

  React.useLayoutEffect(() => {
    const viewport = dayBodyViewportReference.current;
    if (!viewport) {
      return;
    }

    const updateFromDayViewport = () => {
      const nextWidth = Math.max(Math.ceil(viewport.clientWidth), minCalendarTrackWidth);
      setCalendarTrackWidth((current) => (current === nextWidth ? current : nextWidth));
      const nextClientHeight = viewport.clientHeight;
      setDayBodyViewportClientHeight((current) =>
        current === nextClientHeight ? current : nextClientHeight,
      );
    };

    updateFromDayViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFromDayViewport);
      return () => {
        window.removeEventListener("resize", updateFromDayViewport);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateFromDayViewport();
    });

    resizeObserver.observe(viewport);
    return () => {
      resizeObserver.disconnect();
    };
  }, [calendarTrackWidth, calendarViewportHeight, minCalendarTrackWidth, selectedSchedule]);

  React.useLayoutEffect(() => {
    const viewport = dayBodyViewportReference.current;
    if (!viewport || !calendarViewportHeight || hasAutoScrolledReference.current) {
      return;
    }

    const nextScrollTop = getInitialScheduleScrollTop(weekdaySchedules, axisStartMinutes);
    const frame = globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        viewport.scrollTop = nextScrollTop;
        if (timeRailReference.current) {
          timeRailReference.current.scrollTop = nextScrollTop;
        }
        hasAutoScrolledReference.current = true;
      });
    });

    return () => {
      globalThis.cancelAnimationFrame(frame);
    };
  }, [axisStartMinutes, calendarViewportHeight, weekdaySchedules]);

  function handleCalendarViewportScroll(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    if (dayHeaderTrackReference.current) {
      dayHeaderTrackReference.current.style.transform = `translateX(${-event.currentTarget.scrollLeft}px)`;
    }

    if (timeRailReference.current) {
      timeRailReference.current.scrollTop = event.currentTarget.scrollTop;
    }
  }

  function applyToDays(targetDays: readonly WeekdayCode[]) {
    const sanitizedTargetDays = targetDays.filter((day) => day !== selectedDay);

    if (sanitizedTargetDays.length === 0) {
      return;
    }

    onCopyWeekdaySchedule(selectedDay, sanitizedTargetDays);
  }

  function toggleSelectedApplyDay(day: WeekdayCode) {
    setSelectedApplyDays((current) =>
      current.includes(day) ? current.filter((candidate) => candidate !== day) : [...current, day],
    );
  }

  return {
    applyToDays,
    calendarTrackWidth,
    timeRailViewportHeight,
    dayBodyViewportReference,
    dayHeaderTrackReference,
    editorCardReference,
    handleCalendarViewportScroll,
    matchingDays,
    selectedApplyDays,
    selectedDay,
    selectedSchedule,
    setSelectedDay,
    timeRailReference,
    toggleSelectedApplyDay,
    viewportHeight,
  };
}
