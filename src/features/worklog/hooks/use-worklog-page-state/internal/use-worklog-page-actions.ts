import { useCallback } from "react";

import type { PeriodRangeState } from "@/features/worklog/lib/worklog-date-utils";
import type { ResolvedWorklogMode } from "@/features/worklog/state/worklog-ui-state/worklog-ui-state";

interface UseWorklogPageActionsArgs {
  detailDate: Date | null;
  displayMode: ResolvedWorklogMode;
  onCloseNestedDay: () => void;
  referenceDate: Date;
  dispatch: (action: WorklogPageAction) => void;
}

type WorklogPageAction =
  | { type: "set_day_selected_date"; date: Date }
  | { type: "set_week_selected_date"; date: Date }
  | { type: "commit_period_range"; range: PeriodRangeState }
  | { type: "shift_period"; days: number }
  | { type: "reset_current_period"; date: Date };

export function useWorklogPageActions({
  detailDate,
  displayMode,
  onCloseNestedDay,
  referenceDate,
  dispatch,
}: UseWorklogPageActionsArgs) {
  const isNestedDayView = displayMode !== "day" && detailDate != null;
  const closeNestedDayIfOpen = useCallback(() => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
  }, [isNestedDayView, onCloseNestedDay]);

  const onDaySelectDate = useCallback(
    (date: Date) => {
      closeNestedDayIfOpen();
      dispatch({ type: "set_day_selected_date", date });
    },
    [closeNestedDayIfOpen, dispatch],
  );
  const onWeekSelectDate = useCallback(
    (date: Date) => {
      closeNestedDayIfOpen();
      dispatch({ type: "set_week_selected_date", date });
    },
    [closeNestedDayIfOpen, dispatch],
  );
  const onPeriodSelectRange = useCallback(
    (range: PeriodRangeState) => {
      closeNestedDayIfOpen();
      dispatch({ type: "commit_period_range", range });
    },
    [closeNestedDayIfOpen, dispatch],
  );
  const onShiftCurrentPeriod = useCallback(
    (days: number) => {
      closeNestedDayIfOpen();
      dispatch({ type: "shift_period", days });
    },
    [closeNestedDayIfOpen, dispatch],
  );
  const onResetCurrentPeriod = useCallback(() => {
    closeNestedDayIfOpen();
    dispatch({ type: "reset_current_period", date: referenceDate });
  }, [closeNestedDayIfOpen, dispatch, referenceDate]);

  return {
    isNestedDayView,
    onDaySelectDate,
    onWeekSelectDate,
    onPeriodSelectRange,
    onShiftCurrentPeriod,
    onResetCurrentPeriod,
  };
}
