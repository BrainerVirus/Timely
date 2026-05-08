import { m } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { logIssueTime } from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { AddIssueTimeDialog } from "@/domains/issues/ui/AddIssueTimeDialog/AddIssueTimeDialog";
import { useNormalizedSnapshotError } from "@/features/worklog/hooks/use-normalized-snapshot-error/use-normalized-snapshot-error";
import { useSnapshotErrorToast } from "@/features/worklog/hooks/use-snapshot-error-toast/use-snapshot-error-toast";
import {
  resetWorklogSnapshotCache,
  useWorklogPageData,
} from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import { createFallbackPeriodSnapshot } from "@/features/worklog/lib/worklog-snapshot";
import {
  collectIssueOptions,
  createAddTimeDialogLabels,
  providerProductName,
} from "@/features/worklog/screens/WorklogPage/internal/worklog-add-time-helpers";
import { NestedDayView } from "@/features/worklog/ui/NestedDayView/NestedDayView";
import { WorklogContent } from "@/features/worklog/ui/WorklogContent/WorklogContent";
import { WorklogStatusState } from "@/features/worklog/ui/WorklogStatusState/WorklogStatusState";
import { WorklogToolbar } from "@/features/worklog/ui/WorklogToolbar/WorklogToolbar";
import { staggerItem } from "@/shared/lib/animations/animations";
import { StaggerGroup } from "@/shared/ui/PageTransition/PageTransition";

import type { AddIssueTimeSubmitInput } from "@/domains/issues/ui/AddIssueTimeDialog/AddIssueTimeDialog";
import type {
  BootstrapPayload,
  IssueRouteReference,
  WorklogMode,
} from "@/shared/types/dashboard";

interface WorklogPageProps {
  payload: BootstrapPayload;
  mode: WorklogMode;
  syncVersion?: number;
  detailDate?: Date | null;
  onModeChange: (mode: WorklogMode) => void;
  onOpenNestedDay: (date: Date) => void;
  onCloseNestedDay: () => void;
  onOpenIssue?: (reference: IssueRouteReference) => void;
  onAddIssueTime?: (reference: IssueRouteReference) => void;
  onRefreshBootstrap?: () => Promise<void>;
}

export function WorklogPage(props: Readonly<WorklogPageProps>) {
  return <WorklogPageView key={props.mode} {...props} />;
}

function WorklogPageView({
  payload,
  mode,
  syncVersion = 0,
  detailDate = null,
  onModeChange,
  onOpenNestedDay,
  onCloseNestedDay,
  onOpenIssue,
  onRefreshBootstrap,
}: Readonly<WorklogPageProps>) {
  const { formatDateRange, locale, t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const {
    activeDate,
    activeSnapshotEntry,
    calendarHolidays,
    calendarWeekStartsOn,
    currentSnapshot,
    currentWeekRange,
    dayCalendarOpen,
    dayVisibleMonth,
    displayMode,
    hasAnySnapshot,
    isCurrentDay,
    isCurrentPeriod,
    isCurrentWeek,
    isNestedDayView,
    onDayCalendarOpenChange,
    onDaySelectDate,
    onDayVisibleMonthChange,
    onPeriodCalendarOpenChange,
    onPeriodDraftRangeChange,
    onPeriodSelectRange,
    onPeriodVisibleMonthChange,
    onResetCurrentPeriod,
    onShiftCurrentPeriod,
    onWeekCalendarOpenChange,
    onWeekSelectDate,
    onWeekVisibleMonthChange,
    periodCalendarOpen,
    periodDraftRange,
    periodLabel,
    periodRange,
    periodRangeDays,
    periodVisibleMonth,
    referenceDate,
    selectedDay,
    weekCalendarOpen,
    weekVisibleMonth,
  } = useWorklogPageData({
    payload,
    mode,
    syncVersion,
    detailDate,
    onCloseNestedDay,
  });
  const isBusy = false;
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [addTimeInitialIssue, setAddTimeInitialIssue] = useState<IssueRouteReference | null>(null);
  const [submittingTime, setSubmittingTime] = useState(false);
  const normalizedError = useNormalizedSnapshotError(activeSnapshotEntry.errorMessage);
  const isConnectionRequiredError = normalizedError === t("worklog.gitlabConnectionRequired");
  const fallbackPeriodSnapshot =
    displayMode === "period" &&
    activeSnapshotEntry.status === "error" &&
    activeSnapshotEntry.snapshot === null &&
    isConnectionRequiredError
      ? createFallbackPeriodSnapshot(periodRange, payload)
      : null;
  const effectiveSnapshot = currentSnapshot ?? fallbackPeriodSnapshot;
  const effectiveSelectedDay = selectedDay ?? fallbackPeriodSnapshot?.selectedDay ?? null;
  const effectivePeriodLabel = periodLabel || formatDateRange(periodRange.from, periodRange.to);
  const issueOptions = useMemo(
    () =>
      collectIssueOptions(payload.assignedIssues, [
        payload.today,
        ...payload.week,
        ...(effectiveSnapshot?.days ?? []),
      ]),
    [effectiveSnapshot?.days, payload.assignedIssues, payload.today, payload.week],
  );
  const addTimeDialogLabels = useMemo(
    () => createAddTimeDialogLabels(t),
    [t],
  );

  const openAddTimeDialog = (reference: IssueRouteReference | null) => {
    setAddTimeInitialIssue(reference);
    setAddTimeOpen(true);
  };

  const submitIssueTime = async (input: AddIssueTimeSubmitInput) => {
    setSubmittingTime(true);
    try {
      await logIssueTime(input);
      resetWorklogSnapshotCache();
      await onRefreshBootstrap?.();
      toast.success(
        t("issues.timeLoggedOnProduct", { product: providerProductName(input.reference.provider) }),
      );
      setAddTimeOpen(false);
    } catch (error) {
      toast.error(t("issues.timeLogFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
      });
      throw error;
    } finally {
      setSubmittingTime(false);
    }
  };

  useSnapshotErrorToast({
    status: activeSnapshotEntry.status,
    requestKey: activeSnapshotEntry.requestKey,
    normalizedError,
    displayMode,
  });

  if (
    activeSnapshotEntry.status === "error" &&
    activeSnapshotEntry.snapshot === null &&
    !isConnectionRequiredError
  ) {
    return (
      <WorklogStatusState
        title={t("worklog.failedToLoadTitle")}
        description={normalizedError ?? t("common.loading")}
        mood="tired"
        centered
        variant="plain"
      />
    );
  }

  if (!hasAnySnapshot && activeSnapshotEntry.status === "idle") {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }

  if (effectiveSnapshot === null) {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }
  if (effectiveSelectedDay === null) {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }
  if (isNestedDayView) {
    return (
      <>
        <NestedDayView
          parentMode={displayMode === "period" ? "period" : "week"}
          onBack={onCloseNestedDay}
          selectedDay={effectiveSelectedDay}
          auditFlags={effectiveSnapshot.auditFlags}
          syncVersion={syncVersion}
          onOpenIssue={onOpenIssue}
          onAddIssueTime={openAddTimeDialog}
        />
        <AddIssueTimeDialog
          open={addTimeOpen}
          assignedIssues={issueOptions}
          defaultDate={effectiveSelectedDay.date}
          initialIssueReference={addTimeInitialIssue}
          locale={locale}
          labels={addTimeDialogLabels}
          submitting={submittingTime}
          onOpenChange={setAddTimeOpen}
          onSubmit={submitIssueTime}
        />
      </>
    );
  }

  return (
    <>
      <StaggerGroup
        className="space-y-6"
        aria-busy={isBusy}
        allowDecorativeAnimation={allowDecorativeAnimation}
        windowVisibility={windowVisibility}
      >
        <m.div variants={staggerItem}>
          <WorklogToolbar
            activeDate={activeDate}
            calendarHolidays={calendarHolidays}
            calendarWeekStartsOn={calendarWeekStartsOn}
            currentWeekRange={currentWeekRange}
            dayCalendarOpen={dayCalendarOpen}
            dayVisibleMonth={dayVisibleMonth}
            displayMode={displayMode}
            isCurrentDay={isCurrentDay}
            isCurrentPeriod={isCurrentPeriod}
            isCurrentWeek={isCurrentWeek}
            onAddTime={() => openAddTimeDialog(null)}
            onDayCalendarOpenChange={onDayCalendarOpenChange}
            onDaySelectDate={onDaySelectDate}
            onDayVisibleMonthChange={onDayVisibleMonthChange}
            onModeChange={onModeChange}
            periodCalendarOpen={periodCalendarOpen}
            onPeriodCalendarOpenChange={onPeriodCalendarOpenChange}
            onPeriodDraftRangeChange={onPeriodDraftRangeChange}
            onPeriodSelectRange={onPeriodSelectRange}
            onPeriodVisibleMonthChange={onPeriodVisibleMonthChange}
            onResetCurrentPeriod={onResetCurrentPeriod}
            onShiftCurrentPeriod={onShiftCurrentPeriod}
            onWeekCalendarOpenChange={onWeekCalendarOpenChange}
            onWeekSelectDate={onWeekSelectDate}
            onWeekVisibleMonthChange={onWeekVisibleMonthChange}
            periodDraftRange={periodDraftRange}
            periodLabel={effectivePeriodLabel}
            periodRange={periodRange}
            periodRangeDays={periodRangeDays}
            periodVisibleMonth={periodVisibleMonth}
            referenceDate={referenceDate}
            weekCalendarOpen={weekCalendarOpen}
            weekVisibleMonth={weekVisibleMonth}
          />
        </m.div>

        <m.div variants={staggerItem}>
          <WorklogContent
            currentSnapshot={effectiveSnapshot}
            currentWeekRange={currentWeekRange}
            displayMode={displayMode}
            onOpenNestedDay={onOpenNestedDay}
            comparisonDate={payload.today.date}
            periodLabel={effectivePeriodLabel}
            selectedDay={effectiveSelectedDay}
            weekStart={payload.schedule.weekStart}
            timezone={payload.schedule.timezone}
            syncVersion={syncVersion}
            onOpenIssue={onOpenIssue}
            onAddIssueTime={openAddTimeDialog}
          />
        </m.div>
      </StaggerGroup>
      <AddIssueTimeDialog
        open={addTimeOpen}
        assignedIssues={issueOptions}
        defaultDate={effectiveSelectedDay.date}
        initialIssueReference={addTimeInitialIssue}
        locale={locale}
        labels={addTimeDialogLabels}
        submitting={submittingTime}
        onOpenChange={setAddTimeOpen}
        onSubmit={submitIssueTime}
      />
    </>
  );
}
