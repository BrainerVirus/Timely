import { Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { m } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useState } from "react";
import {
  SETUP_PROGRESS_TOTAL_STEPS,
  resolveSetupProgressStep,
  validateSetupScheduleSearch,
} from "@/app/routes/SetupRoutes/setup-schedule-search";
import { toast } from "sonner";
import {
  getAppPreferencesCached,
  saveAppPreferencesCached,
} from "@/app/bootstrap/PreferencesCache/preferences-cache";
import {
  beginGitLabOAuth,
  listenForGitLabOAuthCallback,
  resolveGitLabOAuthCallback,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  validateGitLabToken,
} from "@/app/desktop/TauriService/tauri";
import { SetupShell } from "@/app/layouts/SetupLayout/components/SetupShell/SetupShell";
import {
  SetupScheduleShellWidthSetterProvider,
  useSetupScheduleShellWidthSetter,
  type SetupScheduleShellWidth,
} from "@/app/layouts/SetupLayout/lib/setup-schedule-shell-width-context";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useAppStore } from "@/app/state/AppStore/app-store";
import {
  createInitialScheduleFormState,
  getOrderedWorkdays,
  scheduleFormReducer,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import { prefetchPlaySnapshot } from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";
import { SetupDonePage } from "@/features/setup/screens/SetupDonePage/SetupDonePage";
import { SetupProviderPage } from "@/features/setup/screens/SetupProviderPage/SetupProviderPage";
import { SetupSchedulePage } from "@/features/setup/screens/SetupSchedulePage/SetupSchedulePage";
import { getSupportedTimezones } from "@/shared/lib/utils";
import { SetupSyncPage } from "@/features/setup/screens/SetupSyncPage/SetupSyncPage";
import { SetupWelcomePage } from "@/features/setup/screens/SetupWelcomePage/SetupWelcomePage";
import { SETUP_STEPS, type SetupStep } from "@/features/setup/services/setup-flow/setup-flow";
import { hasActiveConnection } from "@/shared/types/dashboard";

import type {
  BootstrapPayload,
  GitLabConnectionInput,
  ScheduleInput,
  SetupState,
  TimeFormat,
} from "@/shared/types/dashboard";

function usePayload(): BootstrapPayload {
  const lifecycle = useAppStore((state) => state.lifecycle);
  if (lifecycle.phase !== "ready") throw new Error("usePayload called before ready");
  return lifecycle.payload;
}

function resolveSetupStepFromPath(pathname: string): SetupStep {
  const segments = pathname.split("/");
  const step = segments[segments.length - 1];
  return SETUP_STEPS.includes(step as SetupStep) ? (step as SetupStep) : "welcome";
}

function persistSetupStep(
  completeSetupStep: (step: SetupState["currentStep"]) => Promise<void>,
  step: SetupState["currentStep"],
  t: ReturnType<typeof useI18n>["t"],
) {
  void completeSetupStep(step).catch((error) => {
    toast.error(t("app.failedToLoad"), {
      description: error instanceof Error ? error.message : t("settings.tryAgain"),
    });
  });
}

export function SetupIndexRoute() {
  return <Navigate to="/setup/welcome" />;
}

export function SetupLayoutRoute() {
  const { pathname, searchRecord } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      searchRecord: state.location.search as Record<string, unknown>,
    }),
  });
  const step = resolveSetupStepFromPath(pathname);
  const scheduleSubstepForProgress =
    step === "schedule" ? validateSetupScheduleSearch(searchRecord).substep : 0;
  const progressStep = resolveSetupProgressStep(step, scheduleSubstepForProgress);
  const [scheduleShellWidth, setScheduleShellWidth] = useState<SetupScheduleShellWidth>("default");

  useEffect(() => {
    if (step !== "schedule") {
      setScheduleShellWidth("default");
    }
  }, [step]);

  const shellWidth = step === "schedule" ? scheduleShellWidth : "default";

  return (
    <SetupScheduleShellWidthSetterProvider value={setScheduleShellWidth}>
      <SetupShell
        step={progressStep}
        totalSteps={SETUP_PROGRESS_TOTAL_STEPS}
        width={shellWidth}
      >
        <m.div
          key={step}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Outlet />
        </m.div>
      </SetupShell>
    </SetupScheduleShellWidthSetterProvider>
  );
}

export function SetupWelcomeRouteComponent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <SetupWelcomePage
      onNext={() => {
        navigate({ to: "/setup/schedule" });
        persistSetupStep(completeSetupStep, "welcome", t);
      }}
    />
  );
}

export function SetupProviderRouteComponent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const refreshConnections = useAppStore((state) => state.refreshConnections);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <SetupProviderPage
      connections={connections}
      onBack={() => navigate({ to: "/setup/schedule", search: { substep: 1 } })}
      onNext={() => {
        navigate({ to: "/setup/sync" });
        persistSetupStep(completeSetupStep, "provider", t);
      }}
      onSaveConnection={async (input: GitLabConnectionInput) => {
        const saved = await saveGitLabConnection(input);
        await refreshConnections();
        return saved;
      }}
      onSavePat={async (host: string, token: string) => {
        const saved = await saveGitLabPat(host, token);
        await refreshConnections();
        return saved;
      }}
      onBeginOAuth={beginGitLabOAuth}
      onResolveCallback={(sessionId: string, callbackUrl: string) =>
        resolveGitLabOAuthCallback({ sessionId, callbackUrl })
      }
      onValidateToken={validateGitLabToken}
      onListenOAuthEvents={listenForGitLabOAuthCallback}
    />
  );
}

export function SetupScheduleRouteComponent() {
  const { t, formatTimezoneOffset } = useI18n();
  const payload = usePayload();
  const navigate = useNavigate();
  const refreshPayload = useAppStore((state) => state.refreshPayload);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const timeFormat = useAppStore((state) => state.timeFormat);
  const setTimeFormat = useAppStore((state) => state.setTimeFormat);
  const setScheduleShellWidth = useSetupScheduleShellWidthSetter();
  const scheduleSubStep = useRouterState({
    select: (state) => validateSetupScheduleSearch(state.location.search as Record<string, unknown>)
      .substep,
  });
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { weekdaySchedules, timezone, weekStart, schedulePhase } = scheduleForm;
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);

  const timezoneOptions = useMemo(
    () =>
      getSupportedTimezones(timezone).map((tz) => {
        const city = tz.split("/").pop()?.replaceAll("_", " ") ?? tz;
        const offset = formatTimezoneOffset(tz);

        return {
          value: tz,
          label: `(${offset}) ${city}`,
          badge: tz.split("/")[0],
        };
      }),
    [timezone, formatTimezoneOffset],
  );

  const handleTimeFormatChange = useCallback(async (format: TimeFormat) => {
    setTimeFormat(format);
    try {
      const current = await getAppPreferencesCached();
      await saveAppPreferencesCached({ ...current, timeFormat: format });
    } catch {
      // best effort; store already updated
    }
  }, [setTimeFormat]);

  useLayoutEffect(() => {
    setScheduleShellWidth(scheduleSubStep === 0 ? "default" : "wide");
    return () => {
      setScheduleShellWidth("default");
    };
  }, [scheduleSubStep, setScheduleShellWidth]);

  async function handleSaveSchedule(input: ScheduleInput) {
    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await updateSchedule(input);
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });
      void refreshPayload();
      void prefetchPlaySnapshot().catch(() => {
        // best effort - just warm the local snapshot cache
      });
    } catch (err) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      const detail =
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : t("settings.scheduleSaveToastErrorFallback");
      toast.error(t("settings.scheduleSaveToastErrorTitle"), {
        description: detail,
        duration: 8000,
      });
      throw err;
    }
  }

  return (
    <SetupSchedulePage
      scheduleSubStep={scheduleSubStep}
      weekdaySchedules={weekdaySchedules}
      timezone={timezone}
      weekStart={weekStart}
      orderedWorkdays={orderedWorkdays}
      timezoneOptions={timezoneOptions}
      timeFormat={timeFormat}
      schedulePhase={schedulePhase}
      onBack={() => navigate({ to: "/setup/welcome" })}
      onNext={() => {
        navigate({ to: "/setup/provider" });
        persistSetupStep(completeSetupStep, "schedule", t);
      }}
      onAdvanceSubStep={() =>
        navigate({ to: "/setup/schedule", search: { substep: 1 }, replace: true })
      }
      onBackSubStep={() => navigate({ to: "/setup/schedule", search: { substep: 0 }, replace: true })}
      onTimezoneChange={(value) => dispatchScheduleForm({ type: "setTimezone", value })}
      onWeekStartChange={(value) => dispatchScheduleForm({ type: "setWeekStart", value })}
      onTimeFormatChange={(format) => void handleTimeFormatChange(format)}
      onSetWeekdayEnabled={(day, enabled) =>
        dispatchScheduleForm({ type: "setWeekdayEnabled", day, enabled })
      }
      onSetWeekdayField={(day, field, value) =>
        dispatchScheduleForm({ type: "setWeekdayField", day, field, value })
      }
      onCopyWeekdaySchedule={(sourceDay, targetDays) =>
        dispatchScheduleForm({
          type: "copyWeekdaySchedule",
          sourceDay,
          targetDays,
        })
      }
      onSave={handleSaveSchedule}
    />
  );
}

export function SetupSyncRouteComponent() {
  const { t } = useI18n();
  const payload = usePayload();
  const navigate = useNavigate();
  const syncState = useAppStore((state) => state.syncState);
  const startSync = useAppStore((state) => state.startSync);
  const connections = useAppStore((state) => state.connections);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <SetupSyncPage
      payload={payload}
      syncState={syncState}
      hasConnection={hasActiveConnection(connections)}
      onBack={() => navigate({ to: "/setup/provider" })}
      onNext={() => {
        navigate({ to: "/setup/done" });
        persistSetupStep(completeSetupStep, "sync", t);
      }}
      onStartSync={startSync}
    />
  );
}

export function SetupDoneRouteComponent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setupState = useAppStore((s) => s.setupState);
  const markSetupAsComplete = useAppStore((state) => state.markSetupComplete);
  const [isFinishing, setIsFinishing] = useState(false);

  async function handleOpenHome() {
    if (isFinishing) {
      return;
    }

    try {
      setIsFinishing(true);
      await markSetupAsComplete();
      navigate({ to: "/" });
    } catch (error) {
      setIsFinishing(false);
      toast.error(t("app.failedToLoad"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
      });
    }
  }

  useEffect(() => {
    if (!setupState.completedSteps.includes("schedule")) {
      navigate({ to: "/setup/welcome" });
    }
  }, [navigate, setupState.completedSteps]);

  return <SetupDonePage onOpenHome={() => void handleOpenHome()} isFinishing={isFinishing} />;
}
