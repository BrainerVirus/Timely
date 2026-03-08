import { Navigate, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useReducer } from "react";
import {
  createInitialScheduleFormState,
  formatNetHours,
  scheduleFormReducer,
} from "@/features/preferences/schedule-form";
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
import type { BootstrapPayload, GitLabConnectionInput, ScheduleInput } from "@/types/dashboard";
import { RouteLoadingState } from "./loading-states";

/* ------------------------------------------------------------------ */
/*  Lazy page imports                                                  */
/* ------------------------------------------------------------------ */

const SetupDonePage = lazy(() =>
  import("@/features/setup/setup-done-page").then((mod) => ({ default: mod.SetupDonePage })),
);
const SetupProviderPage = lazy(() =>
  import("@/features/setup/setup-provider-page").then((mod) => ({ default: mod.SetupProviderPage })),
);
const SetupSchedulePage = lazy(() =>
  import("@/features/setup/setup-schedule-page").then((mod) => ({ default: mod.SetupSchedulePage })),
);
const SetupSyncPage = lazy(() =>
  import("@/features/setup/setup-sync-page").then((mod) => ({ default: mod.SetupSyncPage })),
);
const SetupWelcomePage = lazy(() =>
  import("@/features/setup/setup-welcome-page").then((mod) => ({ default: mod.SetupWelcomePage })),
);

/* ------------------------------------------------------------------ */
/*  Shared hook                                                        */
/* ------------------------------------------------------------------ */

function usePayload(): BootstrapPayload {
  const lifecycle = useAppStore((state) => state.lifecycle);
  if (lifecycle.phase !== "ready") throw new Error("usePayload called before ready");
  return lifecycle.payload;
}

/* ------------------------------------------------------------------ */
/*  Route components                                                   */
/* ------------------------------------------------------------------ */

export function SetupIndexRoute() {
  return <Navigate to="/setup/welcome" />;
}

export function SetupWelcomeRouteComponent() {
  const navigate = useNavigate();
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const markSetupAsComplete = useAppStore((state) => state.markSetupComplete);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading setup" />}>
      <SetupWelcomePage
        onNext={async () => {
          await completeSetupStep("welcome");
          navigate({ to: "/setup/schedule" });
        }}
        onSkip={async () => {
          await markSetupAsComplete();
          navigate({ to: "/" });
        }}
      />
    </Suspense>
  );
}

export function SetupProviderRouteComponent() {
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const refreshConnections = useAppStore((state) => state.refreshConnections);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading provider setup" />}>
      <SetupProviderPage
        connections={connections}
        onBack={() => navigate({ to: "/setup/schedule" })}
        onNext={async () => {
          await completeSetupStep("provider");
          navigate({ to: "/setup/sync" });
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
    </Suspense>
  );
}

export function SetupScheduleRouteComponent() {
  const payload = usePayload();
  const navigate = useNavigate();
  const refreshPayload = useAppStore((state) => state.refreshPayload);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, schedulePhase } = scheduleForm;
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);

  async function handleSaveSchedule(input: ScheduleInput) {
    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await updateSchedule(input);
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });
      await refreshPayload();
    } catch (err) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      throw err;
    }
  }

  return (
    <Suspense fallback={<RouteLoadingState label="Loading schedule setup" />}>
      <SetupSchedulePage
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
        lunchMinutes={lunchMinutes}
        workdays={workdays}
        timezone={timezone}
        netHours={netHours}
        schedulePhase={schedulePhase}
        onBack={() => navigate({ to: "/setup/welcome" })}
        onNext={async () => {
          await completeSetupStep("schedule");
          navigate({ to: "/setup/provider" });
        }}
        onShiftStartChange={(value) => dispatchScheduleForm({ type: "setShiftStart", value })}
        onShiftEndChange={(value) => dispatchScheduleForm({ type: "setShiftEnd", value })}
        onLunchMinutesChange={(value) => dispatchScheduleForm({ type: "setLunchMinutes", value })}
        onToggleWorkday={(day) => dispatchScheduleForm({ type: "toggleWorkday", day })}
        onSave={handleSaveSchedule}
      />
    </Suspense>
  );
}

export function SetupSyncRouteComponent() {
  const payload = usePayload();
  const navigate = useNavigate();
  const syncState = useAppStore((state) => state.syncState);
  const startSync = useAppStore((state) => state.startSync);
  const connections = useAppStore((state) => state.connections);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading sync setup" />}>
      <SetupSyncPage
        payload={payload}
        syncState={syncState}
        hasConnection={hasActiveConnection(connections)}
        onBack={() => navigate({ to: "/setup/provider" })}
        onNext={async () => {
          await completeSetupStep("sync");
          navigate({ to: "/setup/done" });
        }}
        onStartSync={startSync}
      />
    </Suspense>
  );
}

export function SetupDoneRouteComponent() {
  const navigate = useNavigate();
  const markSetupAsComplete = useAppStore((state) => state.markSetupComplete);

  useEffect(() => {
    void markSetupAsComplete();
  }, [markSetupAsComplete]);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading finish screen" />}>
      <SetupDonePage onOpenHome={() => navigate({ to: "/" })} />
    </Suspense>
  );
}
