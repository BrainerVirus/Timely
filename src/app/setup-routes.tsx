import { Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { m } from "motion/react";
import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { prefetchPlaySnapshot } from "@/features/play/play-snapshot-cache";
import {
  createInitialScheduleFormState,
  formatNetHours,
  scheduleFormReducer,
} from "@/features/preferences/schedule-form";
import { SetupDonePage } from "@/features/setup/setup-done-page";
import { SETUP_STEPS, type SetupStep } from "@/features/setup/setup-flow";
import { SetupProviderPage } from "@/features/setup/setup-provider-page";
import { SetupSchedulePage } from "@/features/setup/setup-schedule-page";
import { SetupShell } from "@/features/setup/setup-shell";
import { SetupSyncPage } from "@/features/setup/setup-sync-page";
import { SetupWelcomePage } from "@/features/setup/setup-welcome-page";
import { useI18n } from "@/lib/i18n";
import {
  beginGitLabOAuth,
  listenForGitLabOAuthCallback,
  resolveGitLabOAuthCallback,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  validateGitLabToken,
} from "@/lib/tauri";
import { useAppStore } from "@/stores/app-store";
import { hasActiveConnection } from "@/types/dashboard";

import type {
  BootstrapPayload,
  GitLabConnectionInput,
  ScheduleInput,
  SetupState,
} from "@/types/dashboard";

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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const step = resolveSetupStepFromPath(pathname);

  return (
    <SetupShell step={SETUP_STEPS.indexOf(step)} totalSteps={SETUP_STEPS.length}>
      <m.div
        key={step}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <Outlet />
      </m.div>
    </SetupShell>
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
      onBack={() => navigate({ to: "/setup/schedule" })}
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
  const { t } = useI18n();
  const payload = usePayload();
  const navigate = useNavigate();
  const refreshPayload = useAppStore((state) => state.refreshPayload);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, timezone, weekStart, schedulePhase } =
    scheduleForm;
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);

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
      toast.error(t("settings.failedSchedule"), {
        description: err instanceof Error ? err.message : t("settings.tryAgain"),
        duration: 6000,
      });
      throw err;
    }
  }

  return (
    <SetupSchedulePage
      shiftStart={shiftStart}
      shiftEnd={shiftEnd}
      lunchMinutes={lunchMinutes}
      workdays={workdays}
      timezone={timezone}
      weekStart={weekStart}
      netHours={netHours}
      schedulePhase={schedulePhase}
      onBack={() => navigate({ to: "/setup/welcome" })}
      onNext={() => {
        navigate({ to: "/setup/provider" });
        persistSetupStep(completeSetupStep, "schedule", t);
      }}
      onShiftStartChange={(value) => dispatchScheduleForm({ type: "setShiftStart", value })}
      onShiftEndChange={(value) => dispatchScheduleForm({ type: "setShiftEnd", value })}
      onLunchMinutesChange={(value) => dispatchScheduleForm({ type: "setLunchMinutes", value })}
      onTimezoneChange={(value) => dispatchScheduleForm({ type: "setTimezone", value })}
      onWeekStartChange={(value) => dispatchScheduleForm({ type: "setWeekStart", value })}
      onToggleWorkday={(day) => dispatchScheduleForm({ type: "toggleWorkday", day })}
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
